import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { Trash2, UsersRound } from 'lucide-react'

export const dynamic = 'force-dynamic'

async function deleteGroup(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  const supabase = createAdminClient()
  await supabase.from('groups').delete().eq('id', id)
  revalidatePath('/admin/groups')
}

export default async function AdminGroupsPage() {
  const supabase = createAdminClient()

  const { data: groups } = await supabase
    .from('groups')
    .select('id, name, code, created_at, creator_id')
    .order('created_at', { ascending: false })

  // Get member counts, activity counts, and creator pseudos
  const groupIds = groups?.map((g) => g.id) ?? []
  const creatorIds = Array.from(new Set((groups ?? []).map((g) => g.creator_id).filter(Boolean))) as string[]

  let memberCounts: Record<string, number> = {}
  let activityCounts: Record<string, number> = {}
  let creatorPseudos: Record<string, string> = {}

  if (groupIds.length > 0) {
    const [{ data: members }, { data: activities }] = await Promise.all([
      supabase.from('group_members').select('group_id').in('group_id', groupIds),
      supabase.from('group_activities').select('group_id').in('group_id', groupIds),
    ])

    memberCounts = (members ?? []).reduce<Record<string, number>>((acc, m) => {
      acc[m.group_id] = (acc[m.group_id] ?? 0) + 1
      return acc
    }, {})

    activityCounts = (activities ?? []).reduce<Record<string, number>>((acc, a) => {
      acc[a.group_id] = (acc[a.group_id] ?? 0) + 1
      return acc
    }, {})
  }

  if (creatorIds.length > 0) {
    const { data: creators } = await supabase
      .from('users')
      .select('id, pseudo')
      .in('id', creatorIds)
    creatorPseudos = (creators ?? []).reduce<Record<string, string>>((acc, u) => {
      acc[u.id] = u.pseudo
      return acc
    }, {})
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bebas text-4xl text-white">GROUPES PRIVÉS</h1>
        <p className="text-white/50 text-sm mt-1">{groups?.length ?? 0} groupes créés</p>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-white/40 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Nom</th>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-center">Membres</th>
                <th className="px-4 py-3 text-center">Activités</th>
                <th className="px-4 py-3 text-left">Créateur</th>
                <th className="px-4 py-3 text-left">Créé</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {groups?.map((group) => (
                <tr key={group.id} className="hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <UsersRound className="w-4 h-4 text-blue-400/50" />
                      <span className="text-white font-medium">{group.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded text-xs font-mono">
                      {group.code}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-center text-white/70">{memberCounts[group.id] ?? 0}</td>
                  <td className="px-4 py-3 text-center text-white/70">{activityCounts[group.id] ?? 0}</td>
                  <td className="px-4 py-3 text-white/60 text-xs">
                    {group.creator_id ? (creatorPseudos[group.creator_id] ?? '—') : '—'}
                  </td>
                  <td className="px-4 py-3 text-white/40 text-xs whitespace-nowrap">
                    {new Date(group.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3">
                    <form action={deleteGroup}>
                      <input type="hidden" name="id" value={group.id} />
                      <button
                        type="submit"
                        className="p-1.5 rounded text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {(!groups || groups.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-white/30 text-sm">
                    Aucun groupe créé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
