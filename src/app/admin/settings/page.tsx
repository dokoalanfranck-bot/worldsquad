import { createAdminClient } from '@/lib/supabase/admin'
import { SettingsClient } from './SettingsClient'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const admin = createAdminClient()
  const { data: flags } = await admin
    .from('feature_flags')
    .select('*')
    .order('key')

  return <SettingsClient initialFlags={flags ?? []} />
}
