import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from './_components/AdminSidebar'
import { PingProvider } from '@/components/PingProvider'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('is_admin, pseudo')
    .eq('id', authUser.id)
    .single()

  if (!profile?.is_admin) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <PingProvider />
      <AdminSidebar pseudo={profile.pseudo} />
      <main className="lg:pl-64 min-h-screen">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
