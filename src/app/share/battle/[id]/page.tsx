import { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'

interface Props {
  params: Promise<{ id: string }>
}

async function getBattle(id: string) {
  const admin = createAdminClient()
  const { data: battle } = await admin.from('battles').select('*').eq('id', id).single()
  if (!battle) return null
  const [{ data: winner }, { data: loser }, { data: card }] = await Promise.all([
    admin.from('users').select('pseudo, nation').eq('id', battle.winner_id ?? '').single(),
    admin.from('users').select('pseudo, nation').eq('id',
      battle.winner_id === battle.challenger_id ? battle.opponent_id : battle.challenger_id
    ).single(),
    battle.reward_card_id
      ? admin.from('cards').select('name, rarity, nation').eq('id', battle.reward_card_id).single()
      : Promise.resolve({ data: null }),
  ])
  return { battle, winner, loser, card: card ?? null }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const result = await getBattle(id)
  if (!result) return { title: 'Battle WorldSquad' }

  const { winner, card } = result
  const winnerName = winner?.pseudo ?? 'Un joueur'
  const cardName = card?.name ?? ''
  const rarity = card?.rarity ?? 'Common'

  const ogUrl = `/api/og?type=battle&winner=${encodeURIComponent(winnerName)}&card=${encodeURIComponent(cardName)}&rarity=${rarity}`

  return {
    title: `${winnerName} a gagné un battle sur WorldSquad !`,
    description: cardName
      ? `${winnerName} a volé la carte ${cardName} (${rarity}) lors d'une bataille WorldSquad épique !`
      : `${winnerName} vient de remporter un battle sur WorldSquad !`,
    openGraph: {
      title: `⚔️ ${winnerName} a gagné un battle WorldSquad !`,
      description: cardName ? `Carte volée : ${cardName} · ${rarity}` : 'Rejoins WorldSquad pour affronter des joueurs du monde entier',
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `⚔️ ${winnerName} a gagné un battle WorldSquad !`,
      images: [ogUrl],
    },
  }
}

export default async function BattleSharePage({ params }: Props) {
  const { id } = await params
  const result = await getBattle(id)
  if (!result) notFound()

  const { winner, loser, card, battle } = result

  const RARITY_COLORS: Record<string, string> = {
    Common: '#9CA3AF', Rare: '#00D4FF', Epic: '#A855F7', Legend: '#F5C518',
  }
  const rarity = card?.rarity ?? 'Common'
  const color = RARITY_COLORS[rarity] ?? '#9CA3AF'
  const score = battle.final_score as { home: number; away: number } | null

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-5">
        {/* Header */}
        <div className="text-center">
          <div className="text-4xl mb-3">⚽</div>
          <h1 className="text-2xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '2px' }}>
            WORLDSQUAD 2026
          </h1>
        </div>

        {/* Battle result */}
        <div className="rounded-3xl border border-[#F5C518]/20 bg-[#F5C518]/5 p-8 text-center space-y-4">
          <div className="text-5xl">⚔️</div>
          <h2 className="text-4xl font-black text-[#F5C518]" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            VICTOIRE !
          </h2>

          {/* versus */}
          <div className="flex items-center justify-center gap-3">
            <div>
              <p className="text-white font-black text-lg">{winner?.pseudo ?? '?'}</p>
              <p className="text-white/30 text-xs">{winner?.nation ?? ''}</p>
            </div>
            <div className="text-white/20 text-sm font-bold px-3">bat</div>
            <div>
              <p className="text-white/50 font-black text-lg">{loser?.pseudo ?? '?'}</p>
              <p className="text-white/20 text-xs">{loser?.nation ?? ''}</p>
            </div>
          </div>

          {score && (
            <p className="text-[#F5C518] text-2xl font-black" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
              {score.home} — {score.away}
            </p>
          )}
        </div>

        {/* Stolen card */}
        {card && (
          <div
            className="rounded-2xl border p-5 text-center"
            style={{ borderColor: `${color}30`, background: `${color}08` }}
          >
            <p className="text-white/40 text-xs mb-2">🎴 Carte volée</p>
            <p className="text-white font-black text-xl mb-1">{card.name}</p>
            <p className="text-xs font-bold" style={{ color }}>
              {card.rarity}
            </p>
          </div>
        )}

        {/* CTA */}
        <div className="rounded-2xl border border-white/5 bg-white/3 p-6 text-center space-y-4">
          <p className="text-white font-black text-xl">Relève le défi !</p>
          <p className="text-white/50 text-sm">
            Compose ta meilleure équipe, affronte d&apos;autres joueurs et vole leurs cartes FIFA.
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
