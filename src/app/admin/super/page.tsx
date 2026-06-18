import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SuperAdminClient } from './SuperAdminClient'

export const metadata = { title: 'Super Admin — WorldSquad' }

export default async function SuperAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin.from('users').select('is_super_admin, email').eq('id', user.id).single()
  if (!profile?.is_super_admin) redirect('/admin')

  return (
    <div className="p-6 lg:p-10">
      <SuperAdminClient superAdminEmail={profile.email ?? user.email ?? ''} />
    </div>
  )
}
