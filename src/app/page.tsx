import Link from 'next/link'
import { Globe, Target, LayoutGrid, Swords, Users, ArrowRight, Zap, Trophy, Star } from 'lucide-react'
import { Countdown } from './_components/Countdown'

const NATIONS = [
  { name: 'France', flag: '🇫🇷' }, { name: 'Argentina', flag: '🇦🇷' }, { name: 'Brazil', flag: '🇧🇷' },
  { name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' }, { name: 'Germany', flag: '🇩🇪' }, { name: 'Spain', flag: '🇪🇸' },
  { name: 'Portugal', flag: '🇵🇹' }, { name: 'Netherlands', flag: '🇳🇱' }, { name: 'Belgium', flag: '🇧🇪' },
  { name: 'USA', flag: '🇺🇸' }, { name: 'Mexico', flag: '🇲🇽' }, { name: 'Japan', flag: '🇯🇵' },
  { name: 'Morocco', flag: '🇲🇦' }, { name: 'Senegal', flag: '🇸🇳' }, { name: 'Colombia', flag: '🇨🇴' },
  { name: 'Uruguay', flag: '🇺🇾' }, { name: 'Croatia', flag: '🇭🇷' }, { name: 'Switzerland', flag: '🇨🇭' },
  { name: 'Turkey', flag: '🇹🇷' }, { name: 'Australia', flag: '🇦🇺' }, { name: 'South Korea', flag: '🇰🇷' },
  { name: 'Ecuador', flag: '🇪🇨' }, { name: 'Canada', flag: '🇨🇦' }, { name: 'Ghana', flag: '🇬🇭' },
]

const FEATURES = [
  {
    icon: Target,
    title: 'Pronostics',
    desc: '104 matchs à pronostiquer. Score exact, vainqueur, buteur — gagne des coins à chaque bonne prédiction.',
    color: 'from-green-500/20 to-transparent',
    iconColor: 'text-green-400',
    iconBg: 'bg-green-500/10',
  },
  {
    icon: LayoutGrid,
    title: 'Cartes Collectibles',
    desc: 'Des centaines de cartes joueurs avec vraies photos. Rarités Common à Legend avec effets holographiques.',
    color: 'from-blue-500/20 to-transparent',
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10',
  },
  {
    icon: Swords,
    title: 'Battles',
    desc: 'Défie tes amis en duel. Mise des coins, choisis ta carte, la meilleure stat gagne.',
    color: 'from-red-500/20 to-transparent',
    iconColor: 'text-red-400',
    iconBg: 'bg-red-500/10',
  },
  {
    icon: Users,
    title: 'Ligues Privées',
    desc: 'Crée ta ligue avec tes amis. Code secret, classements en temps réel, feed d\'activité partagé.',
    color: 'from-purple-500/20 to-transparent',
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/10',
  },
]

const STEPS = [
  { num: '01', title: 'Créer un compte', desc: 'Inscription gratuite en 30 secondes. Tu reçois 500 coins de bienvenue.' },
  { num: '02', title: 'Rejoins une ligue', desc: 'Crée ta ligue ou rejoins celle d\'un ami avec le code secret.' },
  { num: '03', title: 'Pronostique & Collectionne', desc: 'Pose tes prédictions, ouvre des packs, bats tes rivaux en battles.' },
  { num: '04', title: 'Sois champion', desc: 'Le meilleur pronostiqueur en fin de Coupe du Monde empoche la gloire.' },
]

const MOCK_CARDS = [
  { flag: '🇫🇷', name: 'Mbappé', rarity: 'LEGEND', borderColor: '#F5C518', glowColor: 'rgba(245,197,24,0.4)', bgColor: 'rgba(245,197,24,0.08)', rarityColor: '#F5C518', rotate: -4, y: -10 },
  { flag: '🇦🇷', name: 'Messi', rarity: 'LEGEND', borderColor: '#F5C518', glowColor: 'rgba(245,197,24,0.4)', bgColor: 'rgba(245,197,24,0.08)', rarityColor: '#F5C518', rotate: 0, y: 0 },
  { flag: '🇧🇷', name: 'Vinicius', rarity: 'EPIC', borderColor: '#A855F7', glowColor: 'rgba(168,85,247,0.35)', bgColor: 'rgba(168,85,247,0.08)', rarityColor: '#A855F7', rotate: 4, y: -10 },
]

export default function LandingPage() {
  const WC_START = new Date('2026-06-11T19:00:00Z').getTime()

  return (
    <main className="min-h-[100dvh] bg-[#0A0A0F] overflow-x-hidden">

      {/* Background layers */}
      <div
        className="fixed inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(245,197,24,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(245,197,24,0.15) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] sm:w-[1000px] h-[500px] opacity-[0.07] rounded-full"
          style={{ background: 'radial-gradient(ellipse, #F5C518 0%, transparent 65%)' }}
        />
        <div
          className="absolute bottom-0 left-0 w-[400px] h-[300px] opacity-[0.05] rounded-full"
          style={{ background: 'radial-gradient(ellipse, #3B82F6 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 right-0 w-[400px] h-[300px] opacity-[0.05] rounded-full"
          style={{ background: 'radial-gradient(ellipse, #A855F7 0%, transparent 70%)' }}
        />
      </div>

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 max-w-7xl mx-auto gap-3">
        <div className="flex items-center gap-1 flex-shrink-0">
          <Globe size={14} className="text-[#F5C518] sm:!w-[18px] sm:!h-[18px]" />
          <span className="text-lg sm:text-2xl lg:text-3xl font-black sm:tracking-wider text-white font-bebas whitespace-nowrap">
            WORLD<span className="text-[#F5C518]">SQUAD</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm text-white/40">
          <span>Pronostics</span>
          <span>Cartes</span>
          <span>Battles</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href="/login" className="hidden sm:block text-sm font-semibold text-gray-400 hover:text-white transition-colors px-3 py-2">
            Connexion
          </Link>
          <Link
            href="/signup"
            className="text-xs sm:text-sm font-bold text-black bg-[#F5C518] hover:bg-[#ffd700] transition-all hover:scale-105 px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl whitespace-nowrap"
          >
            Rejoindre
          </Link>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="relative z-10 pt-8 sm:pt-12 pb-14 sm:pb-20 px-4 sm:px-6 text-center max-w-6xl mx-auto">

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 bg-[#F5C518]/10 border border-[#F5C518]/25 rounded-full px-3 sm:px-4 py-1.5 mb-6 sm:mb-8">
          <Trophy size={11} className="text-[#F5C518] flex-shrink-0" />
          <span className="text-[#F5C518] text-[10px] sm:text-xs font-bold uppercase tracking-widest">
            FIFA World Cup 2026 · USA · Canada · Mexique
          </span>
        </div>

        {/* Title — fluid sizing so it never overflows */}
        <h1
          className="font-black text-white leading-[0.9] mb-5 sm:mb-6 font-bebas"
          style={{ fontSize: 'clamp(2.4rem, 9vw, 6.875rem)' }}
        >
          LA COUPE DU MONDE<br />
          <span className="text-shimmer">ENTRE POTES</span>
        </h1>

        <p className="text-gray-400 text-sm sm:text-lg md:text-xl max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed px-2">
          Pronostics gamifiés · Cartes collectibles · Battles de coins · Classements en temps réel.{' '}
          <span className="text-white font-semibold">500 coins offerts</span> à l&apos;inscription.
        </p>

        {/* Countdown */}
        <Countdown targetMs={WC_START} />

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8 sm:mt-10 px-2">
          <Link
            href="/signup"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#F5C518] hover:bg-[#ffd700] text-black font-black text-base sm:text-lg px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl transition-all hover:scale-105 pulse-gold font-bebas tracking-wide"
          >
            CRÉER MON COMPTE — C&apos;EST GRATUIT
            <ArrowRight size={18} />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center border border-white/10 text-white font-semibold text-sm sm:text-base px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl hover:bg-white/5 transition-colors"
          >
            J&apos;ai déjà un compte →
          </Link>
        </div>
      </section>

      {/* ── NATIONS TICKER ──────────────────────────────────── */}
      <section className="relative z-10 py-6 sm:py-8 overflow-hidden border-y border-white/5">
        <div className="flex animate-scroll-left gap-4 sm:gap-6 whitespace-nowrap" style={{ width: 'max-content' }}>
          {[...NATIONS, ...NATIONS].map((n, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/5 border border-white/8 text-xs sm:text-sm text-white/70 flex-shrink-0"
            >
              <span className="text-base sm:text-lg">{n.flag}</span>
              <span className="font-medium">{n.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── STATS ───────────────────────────────────────────── */}
      <section className="relative z-10 py-12 sm:py-16 px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[
            { value: '104', label: 'Matchs à jouer', sub: 'groupes → finale' },
            { value: '48', label: 'Nations', sub: 'en lice pour le titre' },
            { value: '1200+', label: 'Cartes joueurs', sub: 'avec vraies photos' },
            { value: '500', label: 'Coins offerts', sub: 'à l\'inscription' },
          ].map((s) => (
            <div key={s.label} className="glass rounded-2xl p-4 sm:p-6 text-center border border-white/5 hover:border-[#F5C518]/15 transition-colors">
              <div className="text-3xl sm:text-4xl md:text-5xl font-black text-[#F5C518] font-bebas mb-1">{s.value}</div>
              <div className="text-white font-semibold text-xs sm:text-sm">{s.label}</div>
              <div className="text-white/35 text-[10px] sm:text-xs mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────── */}
      <section className="relative z-10 px-4 sm:px-6 pb-16 sm:pb-20 max-w-6xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white font-bebas mb-3">
            QU&apos;EST-CE QUE WORLDSQUAD ?
          </h2>
          <p className="text-white/40 text-sm sm:text-base max-w-xl mx-auto px-2">
            Un jeu social complet autour de la Coupe du Monde. Tout ce qu&apos;il te faut pour vivre le Mondial autrement.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className={`glass rounded-2xl p-5 sm:p-6 transition-all duration-300 border border-white/5 hover:border-white/10 bg-gradient-to-b ${f.color}`}
            >
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${f.iconBg} flex items-center justify-center mb-3 sm:mb-4`}>
                <f.icon size={20} className={f.iconColor} />
              </div>
              <h3 className="text-white font-bold text-base sm:text-lg mb-1.5 sm:mb-2">{f.title}</h3>
              <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────── */}
      <section className="relative z-10 px-4 sm:px-6 pb-16 sm:pb-20 max-w-5xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white font-bebas mb-3">
            COMMENT ÇA MARCHE ?
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {STEPS.map((s) => (
            <div key={s.num} className="glass rounded-2xl p-4 sm:p-6 border border-white/5 flex gap-3 sm:gap-4">
              <div className="text-3xl sm:text-4xl font-black text-[#F5C518]/20 font-bebas leading-none flex-shrink-0 w-10 sm:w-12">
                {s.num}
              </div>
              <div>
                <h3 className="text-white font-bold text-sm sm:text-base mb-1">{s.title}</h3>
                <p className="text-white/40 text-xs sm:text-sm leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CARDS PREVIEW ───────────────────────────────────── */}
      <section className="relative z-10 px-4 sm:px-6 pb-16 sm:pb-24 max-w-5xl mx-auto">
        <div className="glass rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 border border-white/5 overflow-hidden relative">
          <div
            className="absolute inset-0 opacity-5 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 70% 50%, #A855F7, transparent 60%)' }}
          />
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-10">

            {/* Text */}
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-widest mb-3 sm:mb-4">
                <Star size={11} />
                Cartes Collectibles
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white font-bebas mb-3 sm:mb-4 leading-tight">
                DES CARTES POUR<br />
                <span className="text-purple-400">CHAQUE JOUEUR</span>
              </h2>
              <p className="text-white/50 mb-5 sm:mb-6 text-xs sm:text-sm leading-relaxed">
                1200+ cartes joueurs avec vraies photos. 4 raretés — Common, Rare, Epic, Legend.
                Ouvre des packs, trade, et bats tes amis en duel de stats.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-400 font-bold px-5 py-2.5 rounded-xl transition-colors text-xs sm:text-sm"
              >
                <Zap size={14} />
                Commencer à collectionner
              </Link>
            </div>

            {/* Mock cards — 3 cards, centered, scaled for mobile */}
            <div className="flex gap-2 sm:gap-3 flex-shrink-0 justify-center">
              {MOCK_CARDS.map((card, i) => (
                <div
                  key={i}
                  className="w-20 sm:w-28 rounded-xl sm:rounded-2xl overflow-hidden border"
                  style={{
                    borderColor: card.borderColor,
                    boxShadow: `0 0 16px ${card.glowColor}`,
                    transform: `rotate(${card.rotate}deg) translateY(${card.y * 0.7}px)`,
                  }}
                >
                  <div className="p-1.5 sm:p-2 text-center" style={{ background: card.bgColor }}>
                    <div className="text-2xl sm:text-3xl mb-0.5 sm:mb-1">{card.flag}</div>
                    <div className="text-[10px] sm:text-xs font-bold text-white leading-tight">{card.name}</div>
                    <div
                      className="text-[10px] sm:text-xs font-black mt-0.5 sm:mt-1"
                      style={{ color: card.rarityColor, fontFamily: 'Bebas Neue, sans-serif' }}
                    >
                      {card.rarity}
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────── */}
      <section className="relative z-10 px-4 sm:px-6 pb-20 sm:pb-32 text-center">
        <div className="glass rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 max-w-3xl mx-auto border border-[#F5C518]/10 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-5 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, #F5C518 0%, transparent 65%)' }}
          />
          <div className="relative z-10">
            <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">🏆</div>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-white font-bebas mb-3 sm:mb-4 leading-tight">
              PRÊT POUR LE<br />
              <span className="text-[#F5C518]">COUP D&apos;ENVOI ?</span>
            </h2>
            <p className="text-gray-400 mb-6 sm:mb-8 text-sm sm:text-base">
              Le premier match est le <strong className="text-white">11 juin 2026</strong>.<br />
              Inscription gratuite · Aucune carte bancaire requise.
            </p>
            <Link
              href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#F5C518] hover:bg-[#ffd700] text-black font-black text-lg sm:text-xl px-8 sm:px-10 py-4 sm:py-5 rounded-2xl transition-all hover:scale-105 font-bebas tracking-wide"
            >
              REJOINDRE WORLDSQUAD
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/5 px-4 sm:px-6 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-gray-700" />
            <span className="text-gray-600 text-xs sm:text-sm">WorldSquad — Built for the World Cup 2026.</span>
          </div>
          <div className="flex items-center gap-4 sm:gap-6 text-xs text-gray-700">
            <span>© 2026 WorldSquad</span>
            <span>Jeu 100% gratuit</span>
          </div>
        </div>
      </footer>

    </main>
  )
}
