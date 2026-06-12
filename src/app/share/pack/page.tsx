import { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ card?: string; pseudo?: string }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams
  const cardId = sp.card
  const pseudo = sp.pseudo ?? 'Un joueur'

  let cardName = 'une carte'
  let rarity = 'Common'
  let nation = ''

  if (cardId) {
    const admin = createAdminClient()
    const { data } = await admin.from('cards').select('name, rarity, nation').eq('id', cardId).single()
    if (data) { cardName = data.name; rarity = data.rarity; nation = data.nation ?? '' }
  }

  const ogUrl = `/api/og?type=card&name=${encodeURIComponent(cardName)}&rarity=${rarity}&nation=${encodeURIComponent(nation)}&pseudo=${encodeURIComponent(pseudo)}`

  return {
    title: `${pseudo} a obtenu ${cardName} sur WorldSquad !`,
    description: `${pseudo} vient de débloquer une carte ${rarity} sur WorldSquad — l'app de la Coupe du Monde 2026`,
    openGraph: {
      title: `${pseudo} a obtenu ${cardName} ! 🎴`,
      description: `Rejoins WorldSquad et commence ta propre collection de cartes joueurs`,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${pseudo} a obtenu ${cardName} ! 🎴`,
      description: `Rejoins WorldSquad et commence ta propre collection`,
      images: [ogUrl],
    },
  }
}

export default async function PackSharePage({ searchParams }: Props) {
  const sp = await searchParams
  const cardId = sp.card
  const pseudo = sp.pseudo ?? 'Un joueur'

  let card: { name: string; rarity: string; nation: string | null; description: string | null } | null = null

  if (cardId) {
    const admin = createAdminClient()
    const { data } = await admin.from('cards').select('name, rarity, nation, description').eq('id', cardId).single()
    card = data
  }

  const RARITY_COLORS: Record<string, string> = {
    Common: '#9CA3AF', Rare: '#00D4FF', Epic: '#A855F7', Legend: '#F5C518',
  }
  const RARITY_EMOJIS: Record<string, string> = {
    Common: '🃏', Rare: '💎', Epic: '⚡', Legend: '🏆',
  }
  const RARITY_LABELS: Record<string, string> = {
    Common: 'Commun', Rare: 'Rare', Epic: 'Épique', Legend: 'Légendaire',
  }

  const rarity = card?.rarity ?? 'Common'
  const color = RARITY_COLORS[rarity] ?? '#9CA3AF'

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="text-4xl mb-3">⚽</div>
          <h1 className="text-2xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '2px' }}>
            WORLDSQUAD 2026
          </h1>
        </div>

        {/* Card */}
        {card ? (
          <div
            className="rounded-3xl p-8 border text-center"
            style={{ borderColor: `${color}30`, background: `${color}08` }}
          >
            <div className="text-7xl mb-4">{RARITY_EMOJIS[rarity] ?? '🃏'}</div>
            <div
              className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-4"
              style={{ background: `${color}20`, color, border: `1px solid ${color}50` }}
            >
              {RARITY_LABELS[rarity] ?? rarity}
            </div>
            <h2 className="text-3xl font-black text-white mb-2" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
              {card.name}
            </h2>
            {card.nation && <p className="text-white/50 text-sm mb-3">{card.nation}</p>}
            <p className="text-white/40 text-sm">
              Obtenu par <span className="text-white font-bold">{pseudo}</span>
            </p>
          </div>
        ) : (
          <div className="rounded-3xl p-8 border border-white/5 text-center text-white/30">
            Carte introuvable
          </div>
        )}

        {/* CTA */}
        <div className="rounded-2xl border border-[#F5C518]/20 bg-[#F5C518]/5 p-6 text-center space-y-4">
          <p className="text-white font-black text-xl">Rejoins l&apos;aventure !</p>
          <p className="text-white/50 text-sm">
            Ouvre des packs, collecte des cartes FIFA, affronte tes amis en battle et suis la Coupe du Monde 2026 en direct.
          </p>
          <Link
            href="/login"
            className="block w-full py-3 rounded-xl font-black text-black text-base"
            style={{ background: '#F5C518' }}
          >
            Commencer gratuitement →
          </Link>
        </div>
      </div>
    </div>
  )
}
