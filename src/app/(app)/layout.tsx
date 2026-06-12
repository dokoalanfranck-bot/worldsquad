import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { MusicProvider } from '@/components/MusicProvider'
import { OnboardingGuide } from '@/components/OnboardingGuide'
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
    <div className="min-h-screen bg-[#0A0A0F]">
      <Sidebar user={profile as User} />
      <main className="dashboard-content min-h-screen pb-20 lg:pb-0">
        <MusicProvider>
          {children}
          <OnboardingGuide />
        </MusicProvider>
      </main>
    </div>
  )
}
