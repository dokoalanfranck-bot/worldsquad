import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const BOTS = [
  { pseudo: 'AlphaBotFC', nation: 'France', email: 'bot_alpha@worldsquad.bot' },
  { pseudo: 'TitanBotXI', nation: 'Brazil', email: 'bot_titan@worldsquad.bot' },
  { pseudo: 'OmegaBotSC', nation: 'Argentina', email: 'bot_omega@worldsquad.bot' },
  { pseudo: 'NovaBotFF', nation: 'Spain', email: 'bot_nova@worldsquad.bot' },
  { pseudo: 'ApexBotCF', nation: 'Germany', email: 'bot_apex@worldsquad.bot' },
]

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()

  const { data: profile } = await admin.from('users').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Admin requis' }, { status: 403 })

  // Fetch 75 random cards (15 per bot)
  const { data: cards } = await admin.from('cards').select('id').limit(75)
  if (!cards || cards.length < 15) {
    return NextResponse.json({ error: 'Pas assez de cartes dans la DB' }, { status: 500 })
  }

  const results: Array<{ pseudo: string; status: string }> = []

  for (let i = 0; i < BOTS.length; i++) {
    const bot = BOTS[i]

    // Skip if already exists
    const { data: existing } = await admin.from('users').select('id').eq('pseudo', bot.pseudo).single()
    if (existing) {
      results.push({ pseudo: bot.pseudo, status: 'already_exists' })
      continue
    }

    // Create auth user
    const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
      email: bot.email,
      password: `BotPass_${Math.random().toString(36).slice(2, 10)}!`,
      email_confirm: true,
    })

    if (authErr || !authUser.user) {
      results.push({ pseudo: bot.pseudo, status: `auth_error: ${authErr?.message}` })
      continue
    }

    const botId = authUser.user.id

    // Insert profile
    const { error: profileErr } = await admin.from('users').insert({
      id: botId,
      email: bot.email,
      pseudo: bot.pseudo,
      nation: bot.nation,
      coins: 0,
      is_bot: true,
    })

    if (profileErr) {
      results.push({ pseudo: bot.pseudo, status: `profile_error: ${profileErr.message}` })
      continue
    }

    // Assign 15 cards (each bot gets a different slice)
    const slice = cards.slice(i * 15, i * 15 + 15)
    const userCards = slice.map((c) => ({ user_id: botId, card_id: c.id }))
    await admin.from('user_cards').insert(userCards)

    results.push({ pseudo: bot.pseudo, status: 'created' })
  }

  return NextResponse.json({ results })
}
