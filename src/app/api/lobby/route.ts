import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const BOT_POOL = [
  { botName: 'Shadow_X42',   nation: 'France'       },
  { botName: 'NightWolf7',   nation: 'Brazil'       },
  { botName: 'CobraZone',    nation: 'Argentina'    },
  { botName: 'GhostV10',     nation: 'Portugal'     },
  { botName: 'BlueStar22',   nation: 'Morocco'      },
  { botName: 'TigerBoy33',   nation: 'Senegal'      },
  { botName: 'FlashZero',    nation: 'England'      },
  { botName: 'DarkFox21',    nation: 'Spain'        },
  { botName: 'CometXI',      nation: 'Germany'      },
  { botName: 'AceFire99',    nation: 'Netherlands'  },
  { botName: 'KingSolo88',   nation: 'Ivory Coast'  },
  { botName: 'ProZone_55',   nation: 'Japan'        },
  { botName: 'NovaStar3',    nation: 'USA'          },
  { botName: 'CrownKing77',  nation: 'Belgium'      },
  { botName: 'SpeedForce',   nation: 'Colombia'     },
  { botName: 'IronWave_9',   nation: 'Croatia'      },
  { botName: 'StormBolt',    nation: 'Mexico'       },
  { botName: 'RedPhoenix',   nation: 'Poland'       },
  { botName: 'ZeroGravX',    nation: 'South Korea'  },
  { botName: 'LegendOf7',    nation: 'Cameroon'     },
]

function getBotsForMode(mode: string): typeof BOT_POOL {
  const seed = Math.floor(Date.now() / 120000) // rotate every 2 minutes
  const start = seed % BOT_POOL.length
  const count = mode === 'penalty' ? 2 : 3
  const result = []
  for (let i = 0; i < count; i++) {
    result.push(BOT_POOL[(start + i) % BOT_POOL.length])
  }
  return result
}

// GET — list current lobby players + bots
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode') ?? 'duel'

  const admin = createAdminClient()

  const { data: lobbyEntries } = await admin
    .from('battle_lobby')
    .select('user_id, mode, entered_at')
    .eq('mode', mode)
    .order('entered_at', { ascending: true })
    .limit(20)

  const userIds = (lobbyEntries ?? []).map((e) => e.user_id)
  const { data: profiles } = userIds.length > 0
    ? await admin.from('users').select('id, pseudo, nation, photo_url').in('id', userIds)
    : { data: [] }

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

  const players = (lobbyEntries ?? [])
    .map((e) => {
      const p = profileMap.get(e.user_id)
      if (!p) return null
      return {
        userId: p.id,
        pseudo: p.pseudo,
        nation: p.nation,
        photo_url: p.photo_url,
        isBot: false,
        entered_at: e.entered_at,
        isSelf: p.id === user.id,
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  const bots = getBotsForMode(mode).map((b) => ({
    userId: null,
    pseudo: b.botName,
    nation: b.nation,
    photo_url: null,
    isBot: true,
    botName: b.botName,
    entered_at: new Date(0).toISOString(),
    isSelf: false,
  }))

  // Check if current user is in lobby
  const myEntry = (lobbyEntries ?? []).find((e) => e.user_id === user.id)

  return NextResponse.json({
    players: [...players, ...bots],
    inLobby: !!myEntry,
    myMode: myEntry?.mode ?? null,
  })
}

// POST — join lobby
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { mode } = await req.json() as { mode: 'duel' | 'penalty' }
  if (!mode) return NextResponse.json({ error: 'mode requis' }, { status: 400 })

  const admin = createAdminClient()
  await admin.from('battle_lobby').upsert(
    { user_id: user.id, mode, entered_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  )

  return NextResponse.json({ ok: true })
}

// DELETE — leave lobby
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const admin = createAdminClient()
  await admin.from('battle_lobby').delete().eq('user_id', user.id)

  // Also cancel any stale open/waiting battles this user created
  await Promise.all([
    admin.from('duels')
      .update({ status: 'cancelled', cancelled_reason: 'user_left' })
      .eq('challenger_id', user.id)
      .in('status', ['open', 'invited']),
    admin.from('penalty_battles')
      .update({ status: 'cancelled', cancelled_reason: 'user_left' })
      .eq('challenger_id', user.id)
      .in('status', ['waiting', 'invited']),
  ])

  return NextResponse.json({ ok: true })
}
