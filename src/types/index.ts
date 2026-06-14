export type CardRarity = 'Common' | 'Rare' | 'Epic' | 'Legend'
export type CardType = 'player' | 'nation' | 'event' | 'trophy'
export type MatchStatus = 'upcoming' | 'live' | 'finished'
export type MatchPhase = 'group' | 'round16' | 'quarter' | 'semi' | 'final'
export type PredictionStatus = 'pending' | 'correct_score' | 'correct_winner' | 'wrong'
export type BattleStatus = 'pending' | 'accepted' | 'finished' | 'declined'
export type PurchaseStatus = 'pending' | 'completed' | 'failed'

export interface User {
  id: string
  email: string
  pseudo: string
  photo_url: string | null
  card_image_url: string | null
  nation: string
  coins: number
  level: string
  card_rarity: CardRarity
  is_vip: boolean
  is_admin: boolean
  predictions_correct: number
  battles_won: number
  battles_played: number
  battle_streak: number
  best_streak: number
  daily_reward_claimed_at: string | null
  daily_streak: number
  install_reward_claimed: boolean
  created_at: string
}

export interface Group {
  id: string
  name: string
  code: string
  creator_id: string | null
  created_at: string
}

export interface GroupMember {
  group_id: string
  user_id: string
  joined_at: string
  user?: User
}

export interface Match {
  id: string
  team_a: string
  team_b: string
  flag_a: string | null
  flag_b: string | null
  match_date: string
  score_a: number | null
  score_b: number | null
  status: MatchStatus
  phase: MatchPhase | null
  group_name: string | null
  venue: string | null
  created_at: string
}

export interface Prediction {
  id: string
  user_id: string
  match_id: string
  pred_score_a: number
  pred_score_b: number
  pred_scorer: string | null
  coins_won: number
  status: PredictionStatus
  created_at: string
  match?: Match
  user?: User
}

export interface Card {
  id: string
  type: CardType
  name: string
  rarity: CardRarity
  image_url: string | null
  stats: Record<string, number | string>
  description: string | null
  nation: string | null
  created_at: string
}

export interface UserCard {
  id: string
  user_id: string
  card_id: string
  obtained_at: string
  obtained_via: string | null
  card?: Card
}

export interface BattleRound {
  stat: string
  label: string
  challenger_val: number
  opponent_val: number
  winner: 'challenger' | 'opponent' | 'tie'
}

export interface Battle {
  id: string
  challenger_id: string
  opponent_id: string
  challenger_card_id: string | null
  opponent_card_id: string | null
  coins_stake: number
  winner_id: string | null
  status: BattleStatus
  type?: string
  phase?: string
  stat_compared: string | null
  result_summary: string | null
  rounds: BattleRound[] | null
  created_at: string
  challenger?: User
  opponent?: User
  challenger_card?: Card
  opponent_card?: Card
}

export interface CoinTransaction {
  id: string
  user_id: string
  amount: number
  reason: string
  created_at: string
}

export interface Purchase {
  id: string
  user_id: string
  stripe_session_id: string | null
  pack_type: string
  coins_granted: number
  amount_paid: number
  status: PurchaseStatus
  created_at: string
}

export interface GroupActivity {
  id: string
  group_id: string
  user_id: string
  activity_type: string
  message: string
  metadata: Record<string, unknown>
  created_at: string
  user?: User
}

export const PACK_CONFIGS = {
  common: {
    name: 'Pack Découverte',
    cost: 100,
    cards: 3,
    odds: { Common: 0.70, Rare: 0.25, Epic: 0.05, Legend: 0.00 },
    color: '#9CA3AF',
    icon: '📦',
  },
  rare: {
    name: 'Pack Pro',
    cost: 300,
    cards: 3,
    odds: { Common: 0.05, Rare: 0.45, Epic: 0.40, Legend: 0.10 },
    color: '#00D4FF',
    icon: '💎',
  },
  elite: {
    name: 'Pack Élite',
    cost: 800,
    cards: 5,
    odds: { Common: 0.03, Rare: 0.02, Epic: 0.62, Legend: 0.33 },
    color: '#A855F7',
    icon: '👑',
  },
  legend: {
    name: 'Pack Légendaire',
    cost: 5000,
    cards: 5,
    odds: { Common: 0.02, Rare: 0.00, Epic: 0.23, Legend: 0.75 },
    color: '#F5C518',
    icon: '⚡',
  },
} as const

export const RARITY_COLORS: Record<CardRarity, string> = {
  Common: '#9CA3AF',
  Rare: '#00D4FF',
  Epic: '#A855F7',
  Legend: '#F5C518',
}

export const RARITY_GLOW: Record<CardRarity, string> = {
  Common: 'none',
  Rare: '0 0 20px rgba(0,212,255,0.5)',
  Epic: '0 0 30px rgba(168,85,247,0.6)',
  Legend: '0 0 40px rgba(245,197,24,0.8)',
}

export const NATIONS_2026 = [
  { name: 'Argentina', flag: '🇦🇷', confederation: 'CONMEBOL' },
  { name: 'Australia', flag: '🇦🇺', confederation: 'AFC' },
  { name: 'Austria', flag: '🇦🇹', confederation: 'UEFA' },
  { name: 'Belgium', flag: '🇧🇪', confederation: 'UEFA' },
  { name: 'Bolivia', flag: '🇧🇴', confederation: 'CONMEBOL' },
  { name: 'Brazil', flag: '🇧🇷', confederation: 'CONMEBOL' },
  { name: 'Cameroon', flag: '🇨🇲', confederation: 'CAF' },
  { name: 'Canada', flag: '🇨🇦', confederation: 'CONCACAF' },
  { name: 'Chile', flag: '🇨🇱', confederation: 'CONMEBOL' },
  { name: 'Colombia', flag: '🇨🇴', confederation: 'CONMEBOL' },
  { name: 'Costa Rica', flag: '🇨🇷', confederation: 'CONCACAF' },
  { name: 'Croatia', flag: '🇭🇷', confederation: 'UEFA' },
  { name: 'Czech Republic', flag: '🇨🇿', confederation: 'UEFA' },
  { name: 'Denmark', flag: '🇩🇰', confederation: 'UEFA' },
  { name: 'Ecuador', flag: '🇪🇨', confederation: 'CONMEBOL' },
  { name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', confederation: 'UEFA' },
  { name: 'France', flag: '🇫🇷', confederation: 'UEFA' },
  { name: 'Germany', flag: '🇩🇪', confederation: 'UEFA' },
  { name: 'Ghana', flag: '🇬🇭', confederation: 'CAF' },
  { name: 'Iran', flag: '🇮🇷', confederation: 'AFC' },
  { name: 'Italy', flag: '🇮🇹', confederation: 'UEFA' },
  { name: 'Japan', flag: '🇯🇵', confederation: 'AFC' },
  { name: 'Mali', flag: '🇲🇱', confederation: 'CAF' },
  { name: 'Mexico', flag: '🇲🇽', confederation: 'CONCACAF' },
  { name: 'Morocco', flag: '🇲🇦', confederation: 'CAF' },
  { name: 'Netherlands', flag: '🇳🇱', confederation: 'UEFA' },
  { name: 'New Zealand', flag: '🇳🇿', confederation: 'OFC' },
  { name: 'Nigeria', flag: '🇳🇬', confederation: 'CAF' },
  { name: 'Paraguay', flag: '🇵🇾', confederation: 'CONMEBOL' },
  { name: 'Peru', flag: '🇵🇪', confederation: 'CONMEBOL' },
  { name: 'Poland', flag: '🇵🇱', confederation: 'UEFA' },
  { name: 'Portugal', flag: '🇵🇹', confederation: 'UEFA' },
  { name: 'Qatar', flag: '🇶🇦', confederation: 'AFC' },
  { name: 'Romania', flag: '🇷🇴', confederation: 'UEFA' },
  { name: 'Saudi Arabia', flag: '🇸🇦', confederation: 'AFC' },
  { name: 'Senegal', flag: '🇸🇳', confederation: 'CAF' },
  { name: 'Serbia', flag: '🇷🇸', confederation: 'UEFA' },
  { name: 'South Africa', flag: '🇿🇦', confederation: 'CAF' },
  { name: 'South Korea', flag: '🇰🇷', confederation: 'AFC' },
  { name: 'Spain', flag: '🇪🇸', confederation: 'UEFA' },
  { name: 'Switzerland', flag: '🇨🇭', confederation: 'UEFA' },
  { name: 'Tunisia', flag: '🇹🇳', confederation: 'CAF' },
  { name: 'Turkey', flag: '🇹🇷', confederation: 'UEFA' },
  { name: 'Ukraine', flag: '🇺🇦', confederation: 'UEFA' },
  { name: 'Uruguay', flag: '🇺🇾', confederation: 'CONMEBOL' },
  { name: 'USA', flag: '🇺🇸', confederation: 'CONCACAF' },
  { name: 'Venezuela', flag: '🇻🇪', confederation: 'CONMEBOL' },
  { name: 'Wales', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', confederation: 'UEFA' },
] as const
