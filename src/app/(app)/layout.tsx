import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { MusicProvider } from '@/components/MusicProvider'
import { OnboardingGuide } from '@/components/OnboardingGuide'
import { PingProvider } from '@/components/PingProvider'
import { InstallPrompt } from '@/components/InstallPrompt'
import type { User } from '@/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (!profile) redirect('/signup')

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Sidebar user={profile as User} />
      <main className="dashboard-content min-h-screen">
        <PingProvider />
        <MusicProvider>
          {children}
          <OnboardingGuide />
          <InstallPrompt alreadyClaimed={!!(profile as User).install_reward_claimed} />
        </MusicProvider>
      </main>
    </div>
  )
}
