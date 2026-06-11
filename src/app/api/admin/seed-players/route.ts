import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { WC2026_SQUADS } from '@/data/wc2026-squads'
import { getFC25Stats } from '@/data/wc2026-player-stats'
import type { CardRarity } from '@/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// ─── FLAGS ────────────────────────────────────────────────────────────────────
const FLAGS: Record<string, string> = {
  'Mexico': '🇲🇽', 'South Africa': '🇿🇦', 'South Korea': '🇰🇷', 'Czech Republic': '🇨🇿',
  'Canada': '🇨🇦', 'Bosnia & Herzegovina': '🇧🇦', 'Qatar': '🇶🇦', 'Switzerland': '🇨🇭',
  'Brazil': '🇧🇷', 'Morocco': '🇲🇦', 'Haiti': '🇭🇹', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'USA': '🇺🇸', 'Paraguay': '🇵🇾', 'Australia': '🇦🇺', 'Turkey': '🇹🇷',
  'Germany': '🇩🇪', 'Curaçao': '🇨🇼', 'Ivory Coast': '🇨🇮', 'Ecuador': '🇪🇨',
  'Netherlands': '🇳🇱', 'Japan': '🇯🇵', 'Sweden': '🇸🇪', 'Tunisia': '🇹🇳',
  'Belgium': '🇧🇪', 'Egypt': '🇪🇬', 'Iran': '🇮🇷', 'New Zealand': '🇳🇿',
  'Spain': '🇪🇸', 'Cape Verde': '🇨🇻', 'Saudi Arabia': '🇸🇦', 'Uruguay': '🇺🇾',
  'France': '🇫🇷', 'Senegal': '🇸🇳', 'Iraq': '🇮🇶', 'Norway': '🇳🇴',
  'Argentina': '🇦🇷', 'Algeria': '🇩🇿', 'Austria': '🇦🇹', 'Jordan': '🇯🇴',
  'Portugal': '🇵🇹', 'DR Congo': '🇨🇩', 'Uzbekistan': '🇺🇿', 'Colombia': '🇨🇴',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Croatia': '🇭🇷', 'Ghana': '🇬🇭', 'Panama': '🇵🇦',
}

// ─── KNOWN LEGENDS ────────────────────────────────────────────────────────────
const LEGEND_NAMES = new Set([
  'kylian mbappe', 'kylian mbappé', 'lionel messi', 'cristiano ronaldo', 'erling haaland',
  'jude bellingham', 'vinicius jr', 'vinícius júnior', 'vinicius junior', 'mohamed salah',
  'kevin de bruyne', 'luka modric', 'luka modrić', 'harry kane', 'son heungmin', 'son heung-min',
  'martin odegaard', 'martin ødegaard', 'ruben dias', 'rúben dias', 'virgil van dijk',
  'thibaut courtois', 'alisson', 'ederson', 'sadio mane', 'sadio mané',
  'neymar jr', 'neymar', 'romelu lukaku', 'darwin nunez', 'darwin núñez',
])

const EPIC_NAMES = new Set([
  'ousmane dembele', 'ousmane dembélé', 'marcus thuram', 'bukayo saka', 'declan rice',
  'pedri', 'gavi', 'rodri', 'lamine yamal', 'nico williams', 'florian wirtz', 'jamal musiala',
  'leroy sane', 'leroy sané', 'bruno fernandes', 'bernardo silva', 'rafael leao', 'rafael leão',
  'julian alvarez', 'julián álvarez', 'alexis mac allister', 'enzo fernandez', 'enzo fernández',
  'federico valverde', 'rodrigo de paul', 'achraf hakimi', 'cody gakpo',
  'frenkie de jong', 'ryan gravenberch', 'kalidou koulibaly', 'alphonso davies',
  'jonathan david', 'moises caicedo', 'moisés caicedo', 'hakan calhanoglu', 'hakan çalhanoğlu',
  'granit xhaka', 'santiago gimenez', 'lee kangin', 'rayan cherki', 'viktor gyokeres',
  'alexander isak', 'joao felix', 'joao félix', 'arda guler', 'kenan yildiz',
  'lautaro martinez', 'kim minjae',
])

function assignRarity(name: string): CardRarity {
  const n = name.toLowerCase()
  if (LEGEND_NAMES.has(n)) return 'Legend'
  if (EPIC_NAMES.has(n)) return 'Epic'
  // Hash-based for determinism: ~20% Rare, rest Common
  let hash = 0
  for (const c of n) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
  const h = Math.abs(hash) % 100
  if (h < 5) return 'Epic'
  if (h < 25) return 'Rare'
  return 'Common'
}

function generateStats(pos: string, name: string) {
  // Cherche d'abord dans FC25
  const fc25 = getFC25Stats(name)
  if (fc25) return fc25

  // Fallback déterministe par position
  let seed = 0
  for (const c of name) seed = (seed * 31 + c.charCodeAt(0)) & 0xffffffff
  seed = Math.abs(seed)
  const v = (base: number, range = 12) =>
    Math.min(99, Math.max(25, base + (seed % range) - Math.floor(range / 2)))

  if (pos === 'GK')    return { pace: v(52), shooting: v(18, 8), passing: v(62), defending: v(87, 8), dribbling: v(42, 8), physical: v(80) }
  if (pos === 'DEF')   return { pace: v(73), shooting: v(44), passing: v(68), defending: v(83, 10), dribbling: v(60), physical: v(80) }
  if (pos === 'MID')   return { pace: v(76), shooting: v(72), passing: v(83, 10), defending: v(64), dribbling: v(78), physical: v(72) }
  if (pos === 'COACH') return { pace: v(72, 10), shooting: v(75, 10), passing: v(84, 8), defending: v(88, 8), dribbling: v(80, 8), physical: v(86, 8) }
  return { pace: v(86, 10), shooting: v(85, 10), passing: v(72), defending: v(38), dribbling: v(84, 10), physical: v(74) }
}

// ─── TheSportsDB PHOTO SEARCH ─────────────────────────────────────────────────
interface SportsDBPlayer {
  strPlayer: string
  strSport: string | null
  strThumb: string | null
  strCutout: string | null
}

// Search for a player by name → return best photo URL
async function fetchPlayerPhoto(playerName: string): Promise<string | null> {
  try {
    // Use last name or full name for better results
    const searchTerm = playerName.split(' ').slice(-1)[0] // last name
    const url = `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(playerName)}`
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return null
    const data = await res.json() as { player: SportsDBPlayer[] | null }
    if (!data.player?.length) {
      // Retry with last name only
      const url2 = `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(searchTerm)}`
      const res2 = await fetch(url2, { signal: AbortSignal.timeout(4000) })
      if (!res2.ok) return null
      const data2 = await res2.json() as { player: SportsDBPlayer[] | null }
      const p2 = data2.player?.find((p) =>
        p.strSport?.toLowerCase().includes('soccer') || p.strSport?.toLowerCase().includes('football')
      )
      return p2?.strCutout || p2?.strThumb || null
    }
    // Prefer soccer/football player
    const soccer = data.player.find((p) =>
      p.strSport?.toLowerCase().includes('soccer') || p.strSport?.toLowerCase().includes('football')
    )
    const best = soccer ?? data.player[0]
    return best?.strCutout || best?.strThumb || null
  } catch {
    return null
  }
}

// Process a batch of players in parallel
async function fetchPhotoBatch(names: string[]): Promise<Record<string, string | null>> {
  const results = await Promise.all(names.map(async (name) => ({ name, url: await fetchPlayerPhoto(name) })))
  return Object.fromEntries(results.map((r) => [r.name, r.url]))
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ─── ROUTE ────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('is_admin').eq('id', authUser.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const skipPhotos: boolean = body.skipPhotos ?? false

  const admin = createAdminClient()

  // 1. Charger toutes les cartes joueurs existantes (id, name, nation, image_url)
  const { data: existingRaw } = await admin
    .from('cards')
    .select('id, name, nation, image_url')
    .eq('type', 'player')
    .limit(5000)

  const existing = existingRaw ?? []

  // Map "name||nation" → premier id trouvé (garde une seule carte par joueur)
  const existingMap = new Map<string, { id: string; image_url: string | null }>()
  const allExistingIds = new Set<string>()
  for (const c of existing) {
    allExistingIds.add(c.id)
    const key = `${c.name}||${c.nation ?? ''}`
    if (!existingMap.has(key)) existingMap.set(key, { id: c.id, image_url: c.image_url })
  }

  // Images uploadées manuellement à préserver
  const savedImages: Record<string, string> = {}
  for (const c of existing) {
    if (c.image_url?.includes('supabase.co')) savedImages[c.name] = c.image_url
  }

  // 2. Collect all players + coaches from squads
  type RawPlayer = { name: string; pos: string; team: string; isCoach?: boolean }
  const allPlayers: RawPlayer[] = []
  for (const squad of WC2026_SQUADS) {
    for (const player of squad.players) {
      allPlayers.push({ name: player.name, pos: player.pos, team: squad.team })
    }
    if (squad.coach) {
      allPlayers.push({ name: squad.coach, pos: 'COACH', team: squad.team, isCoach: true })
    }
  }

  // 3. Fetch photos AVANT toute modification DB
  const photoMap: Record<string, string | null> = {}
  let withPhotos = 0
  if (!skipPhotos) {
    const BATCH_SIZE = 5
    for (let i = 0; i < allPlayers.length; i += BATCH_SIZE) {
      const batch = allPlayers.slice(i, i + BATCH_SIZE)
      const batchResults = await fetchPhotoBatch(batch.map((p) => p.name))
      Object.assign(photoMap, batchResults)
      withPhotos += Object.values(batchResults).filter(Boolean).length
      await delay(150)
    }
  }

  // 4. Build card rows — inclure l'id existant si le joueur est déjà en DB
  const cards = allPlayers.map((p) => {
    const flag = FLAGS[p.team] ?? '🏳'
    const rarity: CardRarity = p.isCoach ? 'Rare' : assignRarity(p.name)
    const found = existingMap.get(`${p.name}||${p.team}`)
    return {
      ...(found ? { id: found.id } : {}),
      type: 'player' as const,
      name: p.name,
      rarity,
      image_url: savedImages[p.name] ?? photoMap[p.name] ?? found?.image_url ?? null,
      nation: p.team,
      description: p.isCoach ? `${flag} ${p.team} · Coach` : `${flag} ${p.team} · ${p.pos}`,
      stats: { ...generateStats(p.pos, p.name), position: p.pos },
    }
  })

  // 5. Nettoyer les doublons non possédés
  const keepIds = new Set(cards.filter((c) => 'id' in c).map((c) => (c as { id: string }).id))
  const orphanIds = Array.from(allExistingIds).filter((id) => !keepIds.has(id))
  if (orphanIds.length > 0) {
    const { data: ownedOrphans } = await admin
      .from('user_cards').select('card_id').in('card_id', orphanIds)
    const ownedSet = new Set((ownedOrphans ?? []).map((uc) => uc.card_id))
    const deletable = orphanIds.filter((id) => !ownedSet.has(id))
    if (deletable.length > 0) await admin.from('cards').delete().in('id', deletable)
  }

  // 6. Upsert : update les cartes existantes (by id), insert les nouvelles
  let upserted = 0
  const errors: string[] = []
  for (let i = 0; i < cards.length; i += 100) {
    const { error } = await admin.from('cards').upsert(cards.slice(i, i + 100))
    if (error) errors.push(error.message)
    else upserted += Math.min(100, cards.length - i)
  }

  revalidatePath('/admin')
  revalidatePath('/admin/cards')

  return NextResponse.json({
    ok: true,
    totalPlayers: allPlayers.length,
    upserted,
    withPhotos,
    teamsProcessed: WC2026_SQUADS.length,
    skippedPhotos: skipPhotos,
    cleaned: orphanIds.length,
    errors: errors.length ? errors : undefined,
  })
}
