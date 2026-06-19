import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { WC2026_SQUADS } from '@/data/wc2026-squads'
import { getFC25Stats } from '@/data/wc2026-player-stats'
import type { CardRarity } from '@/types'

export const maxDuration = 300

// â”€â”€â”€ FLAGS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const FLAGS: Record<string, string> = {
  'Mexico': 'ðŸ‡²ðŸ‡½', 'South Africa': 'ðŸ‡¿ðŸ‡¦', 'South Korea': 'ðŸ‡°ðŸ‡·', 'Czech Republic': 'ðŸ‡¨ðŸ‡¿',
  'Canada': 'ðŸ‡¨ðŸ‡¦', 'Bosnia & Herzegovina': 'ðŸ‡§ðŸ‡¦', 'Qatar': 'ðŸ‡¶ðŸ‡¦', 'Switzerland': 'ðŸ‡¨ðŸ‡­',
  'Brazil': 'ðŸ‡§ðŸ‡·', 'Morocco': 'ðŸ‡²ðŸ‡¦', 'Haiti': 'ðŸ‡­ðŸ‡¹', 'Scotland': 'ðŸ´ó §ó ¢ó ³ó £ó ´ó ¿',
  'USA': 'ðŸ‡ºðŸ‡¸', 'Paraguay': 'ðŸ‡µðŸ‡¾', 'Australia': 'ðŸ‡¦ðŸ‡º', 'Turkey': 'ðŸ‡¹ðŸ‡·',
  'Germany': 'ðŸ‡©ðŸ‡ª', 'CuraÃ§ao': 'ðŸ‡¨ðŸ‡¼', 'Ivory Coast': 'ðŸ‡¨ðŸ‡®', 'Ecuador': 'ðŸ‡ªðŸ‡¨',
  'Netherlands': 'ðŸ‡³ðŸ‡±', 'Japan': 'ðŸ‡¯ðŸ‡µ', 'Sweden': 'ðŸ‡¸ðŸ‡ª', 'Tunisia': 'ðŸ‡¹ðŸ‡³',
  'Belgium': 'ðŸ‡§ðŸ‡ª', 'Egypt': 'ðŸ‡ªðŸ‡¬', 'Iran': 'ðŸ‡®ðŸ‡·', 'New Zealand': 'ðŸ‡³ðŸ‡¿',
  'Spain': 'ðŸ‡ªðŸ‡¸', 'Cape Verde': 'ðŸ‡¨ðŸ‡»', 'Saudi Arabia': 'ðŸ‡¸ðŸ‡¦', 'Uruguay': 'ðŸ‡ºðŸ‡¾',
  'France': 'ðŸ‡«ðŸ‡·', 'Senegal': 'ðŸ‡¸ðŸ‡³', 'Iraq': 'ðŸ‡®ðŸ‡¶', 'Norway': 'ðŸ‡³ðŸ‡´',
  'Argentina': 'ðŸ‡¦ðŸ‡·', 'Algeria': 'ðŸ‡©ðŸ‡¿', 'Austria': 'ðŸ‡¦ðŸ‡¹', 'Jordan': 'ðŸ‡¯ðŸ‡´',
  'Portugal': 'ðŸ‡µðŸ‡¹', 'DR Congo': 'ðŸ‡¨ðŸ‡©', 'Uzbekistan': 'ðŸ‡ºðŸ‡¿', 'Colombia': 'ðŸ‡¨ðŸ‡´',
  'England': 'ðŸ´ó §ó ¢ó ¥ó ®ó §ó ¿', 'Croatia': 'ðŸ‡­ðŸ‡·', 'Ghana': 'ðŸ‡¬ðŸ‡­', 'Panama': 'ðŸ‡µðŸ‡¦',
}

// â”€â”€â”€ SYSTÃˆME DE RARETÃ‰ (cote de popularitÃ© + potentiel FC25) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//
// Tier Legend garanti : superstars mondiales dont la renommÃ©e dÃ©passe les stats
// Tier Epic garanti   : stars internationales de premier plan
// Pour tous les autres : score FC25 pondÃ©rÃ© par poste â†’ seuils automatiques
//   â‰¥86 â†’ Legend | â‰¥76 â†’ Epic | â‰¥65 â†’ Rare | <65 â†’ Common

const LEGEND_FLOOR = new Set([
  // Attaquants / milieux offensifs â€” icÃ´nes planÃ©taires
  'kylian mbappe', 'kylian mbappÃ©', 'lionel messi', 'cristiano ronaldo',
  'erling haaland', 'vinicius jr', 'vinÃ­cius jÃºnior', 'vinicius junior',
  'jude bellingham', 'lamine yamal', 'jamal musiala', 'florian wirtz',
  'pedri', 'rodri', 'bukayo saka', 'phil foden',
  'mohamed salah', 'sadio mane', 'sadio manÃ©',
  'harry kane', 'son heung-min', 'son heungmin',
  'neymar', 'neymar jr', 'darwin nunez', 'darwin nÃºÃ±ez',
  'lautaro martinez', 'julian alvarez', 'juliÃ¡n Ã¡lvarez',
  // Milieux / dÃ©fenseurs â€” lÃ©gendes du jeu
  'kevin de bruyne', 'luka modric', 'luka modriÄ‡',
  'martin odegaard', 'martin Ã¸degaard', 'federico valverde',
  // DÃ©fenseurs / GK
  'virgil van dijk', 'ruben dias', 'rÃºben dias',
  'thibaut courtois', 'alisson', 'ederson', 'emiliano martinez',
  // Romelu Lukaku â€” record de buts en sÃ©lection belge
  'romelu lukaku',
])

const EPIC_FLOOR = new Set([
  // France
  'ousmane dembele', 'ousmane dembÃ©lÃ©', 'marcus thuram', 'antoine griezmann',
  'aurelien tchouameni', 'aurÃ©lien tchouamÃ©ni', 'theo hernandez', 'thÃ©o hernandez',
  'william saliba', 'mike maignan', 'randal kolo muani', 'bradley barcola',
  // Angleterre
  'declan rice', 'marcus rashford', 'trent alexander-arnold',
  'john stones', 'kyle walker', 'kobbie mainoo',
  // Espagne
  'gavi', 'nico williams', 'dani carvajal', 'alejandro grimaldo',
  'ferran torres', 'alvaro morata', 'pau torres',
  // Allemagne
  'leroy sane', 'leroy sanÃ©', 'kai havertz', 'thomas muller', 'thomas mÃ¼ller',
  'antonio rudiger', 'antonio rÃ¼diger', 'joshua kimmich', 'ilkay gundogan',
  'serge gnabry', 'josko gvardiol',
  // Portugal
  'bruno fernandes', 'bernardo silva', 'rafael leao', 'rafael leÃ£o',
  'joao felix', 'joao fÃ©lix', 'diogo jota', 'vitinha', 'joao neves',
  'nuno mendes', 'joao cancelo',
  // Pays-Bas
  'cody gakpo', 'frenkie de jong', 'ryan gravenberch', 'xavi simons',
  'nathan ake', 'denzel dumfries', 'teun koopmeiners', 'tijjani reijnders',
  'jeremy doku', 'donyell malen', 'lois openda',
  // Belgique
  'amadou onana', 'youri tielemans', 'alexis saelemaekers', 'charles de ketelaere',
  'leandro trossard',
  // Argentine
  'alexis mac allister', 'enzo fernandez', 'enzo fernÃ¡ndez', 'rodrigo de paul',
  'cristian romero', 'lisandro martinez', 'nahuel molina', 'leandro paredes',
  // BrÃ©sil
  'raphinha', 'rodrygo', 'gabriel martinelli', 'lucas paqueta', 'lucas paquetÃ¡',
  'marquinhos', 'eder militao', 'casemiro', 'endrick', 'bruno guimaraes',
  // Croatie
  'ivan perisic', 'ivan periÅ¡iÄ‡', 'mateo kovacic', 'mateo kovaÄiÄ‡',
  'andrej kramaric', 'andrej kramariÄ‡', 'marcelo brozovic',
  // SÃ©nÃ©gal
  'kalidou koulibaly', 'idrissa gana gueye', 'ismaila sarr', 'nicolas jackson',
  'pape matar sarr', 'lamine camara',
  // Maroc
  'achraf hakimi', 'hakim ziyech', 'youssef en-nesyri', 'noussair mazraoui',
  'sofyan amrabat', 'nayef aguerd',
  // Japon
  'kaoru mitoma', 'takefusa kubo', 'daichi kamada', 'wataru endo', 'ritsu doan',
  'junya ito', 'takehiro tomiyasu',
  // CorÃ©e du Sud
  'kim minjae', 'hwang hee-chan', 'lee kangin',
  // Mexique
  'santiago gimenez', 'hirving lozano', 'edson alvarez', 'raul jimenez',
  // USA
  'christian pulisic', 'weston mckennie', 'tyler adams', 'giovanni reyna',
  'antonee robinson', 'folarin balogun',
  // Canada
  'alphonso davies', 'jonathan david', 'tajon buchanan', 'stephan eustaquio',
  // Uruguay
  'rodrigo bentancur', 'jose maria gimenez', 'facundo torres',
  // Colombie
  'luis diaz', 'luis dÃ­az', 'moises caicedo', 'moisÃ©s caicedo',
  'james rodriguez', 'james rodrÃ­guez', 'davinson sanchez',
  // Turquie
  'hakan calhanoglu', 'hakan Ã§alhanoÄŸlu', 'arda guler', 'kenan yildiz', 'merih demiral',
  // AlgÃ©rie
  'riyad mahrez', 'houssem aouar', 'amine gouiri', 'ramy bensebaini',
  // SuÃ¨de
  'alexander isak', 'dejan kulusevski', 'viktor gyokeres', 'emil forsberg',
  // Suisse
  'granit xhaka', 'yann sommer', 'breel embolo', 'xherdan shaqiri', 'manuel akanji',
  // NorvÃ¨ge
  'alexander sorloth',
  // Ã‰cosse
  'scott mctominay', 'andy robertson', 'john mcginn',
  // Ghana
  'thomas partey', 'jordan ayew',
  // CÃ´te d'Ivoire
  'franck kessie', 'franck kessiÃ©', 'sebastien haller', 'sÃ©bastien haller',
  // Ã‰gypte
  'omar marmoush',
  // Iran
  'mehdi taremi', 'sardar azmoun',
  // Ã‰quateur
  'enner valencia',
  // Australie
  'mathew leckie',
  // Divers
  'rayan cherki',
])

// Score global pondÃ©rÃ© par poste (basÃ© sur FC25)
function positionOverall(
  s: { pace: number; shooting: number; passing: number; defending: number; dribbling: number; physical: number },
  pos: string
): number {
  const { pace: p, shooting: sh, passing: pa, defending: d, dribbling: dr, physical: ph } = s
  if (pos === 'GK')  return p*0.05 + sh*0.05 + pa*0.10 + d*0.40 + dr*0.05 + ph*0.35
  if (pos === 'DEF') return p*0.10 + sh*0.05 + pa*0.10 + d*0.40 + dr*0.10 + ph*0.25
  if (pos === 'MID') return p*0.10 + sh*0.15 + pa*0.30 + d*0.15 + dr*0.25 + ph*0.05
  // FWD
  return p*0.20 + sh*0.35 + pa*0.10 + d*0.05 + dr*0.30 + ph*0.00
}

function assignRarity(name: string, pos: string): CardRarity {
  const n = name.toLowerCase()

  // Plancher garanti par la renommÃ©e mondiale
  if (LEGEND_FLOOR.has(n)) return 'Legend'
  if (EPIC_FLOOR.has(n)) return 'Epic'

  // Score FC25 pour les joueurs avec des stats rÃ©elles
  const fc25 = getFC25Stats(name)
  if (fc25) {
    const score = positionOverall(fc25, pos)
    if (score >= 86) return 'Legend'
    if (score >= 76) return 'Epic'
    if (score >= 65) return 'Rare'
    return 'Common'
  }

  // Fallback dÃ©terministe pour les joueurs sans stats FC25
  // Distribution : ~3% Epic, ~22% Rare, ~75% Common
  let hash = 0
  for (const c of n) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
  const h = Math.abs(hash) % 100
  if (h < 3) return 'Epic'
  if (h < 25) return 'Rare'
  return 'Common'
}

function generateStats(pos: string, name: string) {
  // Cherche d'abord dans FC25
  const fc25 = getFC25Stats(name)
  if (fc25) return fc25

  // Fallback dÃ©terministe par position
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

// â”€â”€â”€ TheSportsDB PHOTO SEARCH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface SportsDBPlayer {
  strPlayer: string
  strSport: string | null
  strThumb: string | null
  strCutout: string | null
}

// Search for a player by name â†’ return best photo URL
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

// â”€â”€â”€ ROUTE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // Map "name||nation" â†’ premier id trouvÃ© (garde une seule carte par joueur)
  const existingMap = new Map<string, { id: string; image_url: string | null }>()
  const allExistingIds = new Set<string>()
  for (const c of existing) {
    allExistingIds.add(c.id)
    const key = `${c.name}||${c.nation ?? ''}`
    if (!existingMap.has(key)) existingMap.set(key, { id: c.id, image_url: c.image_url })
  }

  // Images uploadÃ©es manuellement Ã  prÃ©server
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

  // 4. Build card rows â€” inclure l'id existant si le joueur est dÃ©jÃ  en DB
  const cards = allPlayers.map((p) => {
    const flag = FLAGS[p.team] ?? 'ðŸ³'
    const rarity: CardRarity = p.isCoach ? 'Rare' : assignRarity(p.name, p.pos)
    const found = existingMap.get(`${p.name}||${p.team}`)
    return {
      ...(found ? { id: found.id } : {}),
      type: 'player' as const,
      name: p.name,
      rarity,
      image_url: savedImages[p.name] ?? photoMap[p.name] ?? found?.image_url ?? null,
      nation: p.team,
      description: p.isCoach ? `${flag} ${p.team} Â· Coach` : `${flag} ${p.team} Â· ${p.pos}`,
      stats: { ...generateStats(p.pos, p.name), position: p.pos },
    }
  })

  // 5. Nettoyer les doublons â€” y compris ceux possÃ©dÃ©s (migrer user_cards vers la carte canonique)
  const keepIds = new Set(cards.filter((c) => 'id' in c).map((c) => (c as { id: string }).id))
  const orphanIds = Array.from(allExistingIds).filter((id) => !keepIds.has(id))

  if (orphanIds.length > 0) {
    // RÃ©cupÃ©rer toutes les user_cards pointant sur des doublons
    const { data: ownedOrphans } = await admin
      .from('user_cards')
      .select('id, user_id, card_id')
      .in('card_id', orphanIds)

    if (ownedOrphans && ownedOrphans.length > 0) {
      // Construire la map orphan_id â†’ canonical_id
      const orphanToCanonical = new Map<string, string>()
      for (const orphanId of orphanIds) {
        const orphanCard = existing.find((c) => c.id === orphanId)
        if (!orphanCard) continue
        const canonical = existingMap.get(`${orphanCard.name}||${orphanCard.nation ?? ''}`)
        if (canonical) orphanToCanonical.set(orphanId, canonical.id)
      }

      // VÃ©rifier quels users possÃ¨dent dÃ©jÃ  la carte canonique
      const affectedUserIds = Array.from(new Set(ownedOrphans.map((uc) => uc.user_id)))
      const canonicalIds = Array.from(new Set(orphanToCanonical.values()))
      const { data: alreadyOwned } = await admin
        .from('user_cards')
        .select('user_id, card_id')
        .in('user_id', affectedUserIds)
        .in('card_id', canonicalIds)

      const ownsCanonical = new Set(
        (alreadyOwned ?? []).map((uc) => `${uc.user_id}__${uc.card_id}`)
      )

      const ucToDelete: string[] = []
      const ucToUpdate: { id: string; card_id: string }[] = []

      for (const uc of ownedOrphans) {
        const canonicalId = orphanToCanonical.get(uc.card_id)
        if (!canonicalId) { ucToDelete.push(uc.id); continue }
        if (ownsCanonical.has(`${uc.user_id}__${canonicalId}`)) {
          // User possÃ¨de dÃ©jÃ  la canonique â†’ supprimer le doublon
          ucToDelete.push(uc.id)
        } else {
          // User ne possÃ¨de que le doublon â†’ rediriger vers la canonique
          ucToUpdate.push({ id: uc.id, card_id: canonicalId })
        }
      }

      if (ucToDelete.length > 0)
        await admin.from('user_cards').delete().in('id', ucToDelete)

      for (const u of ucToUpdate)
        await admin.from('user_cards').update({ card_id: u.card_id }).eq('id', u.id)
    }

    // Supprimer tous les doublons (plus aucune FK ne les rÃ©fÃ©rence)
    await admin.from('cards').delete().in('id', orphanIds)
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
