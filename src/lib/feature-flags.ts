import { createAdminClient } from '@/lib/supabase/admin'

export async function isFeatureEnabled(key: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('feature_flags')
    .select('enabled')
    .eq('key', key)
    .single()
  return data?.enabled ?? true
}
