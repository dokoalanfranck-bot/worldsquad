import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0F] overflow-hidden">
      {/* Background grid */}
      <div
        className="fixed inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(245,197,24,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(245,197,24,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Radial glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #F5C518 0%, transparent 70%)' }}
        />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚽</span>
          <span
            className="text-3xl font-black tracking-wider text-white"
            style={{ fontFamily: 'Bebas Neue, sans-serif' }}
          >
            WORLD<span className="text-[#F5C518]">SQUAD</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-semibold text-gray-400 hover:text-white transition-colors px-4 py-2"
          >
            Connexion
          </Link>
          <Link
            href="/signup"
            className="text-sm font-bold text-black bg-[#F5C518] hover:bg-[#ffd700] transition-colors px-5 py-2.5 rounded-xl"
          >
            Rejoindre
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 pt-16 pb-24 px-6 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-[#F5C518]/10 border border-[#F5C518]/20 rounded-full px-4 py-1.5 mb-8">
          <span className="text-[#F5C518] text-xs font-bold uppercase tracking-widest">
            FIFA World Cup 2026
          </span>
          <span className="text-xs">🏆</span>
        </div>

        <h1
          className="text-6xl md:text-8xl font-black text-white leading-none mb-6"
          style={{ fontFamily: 'Bebas Neue, sans-serif' }}
        >
          VIS LA COUPE DU MONDE
          <br />
          <span className="text-shimmer">ENTRE AMIS</span>
        </h1>

        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Pronostics gamifiés · Cartes collectibles · Battles de potes · Classements temps réel.
          Le tout avec <span className="text-white font-semibold">500 SquadCoins</span> offerts à l&apos;inscription.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/signup"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#F5C518] hover:bg-[#ffd700] text-black font-black text-lg px-8 py-4 rounded-2xl transition-all hover:scale-105 pulse-gold"
            style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.05em' }}
          >
            ⚽ CRÉER MON COMPTE GRATUIT
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-white/10 text-white font-semibold text-base px-8 py-4 rounded-2xl hover:bg-white/5 transition-colors"
          >
            J&apos;ai déjà un compte
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 pb-24 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="glass rounded-2xl p-6 hover:bg-white/5 transition-colors">
              <div className="text-4xl mb-3">{f.icon}</div>
              <h3 className="text-white font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats banner */}
      <section className="relative z-10 px-6 pb-24 max-w-4xl mx-auto">
        <div className="glass rounded-3xl p-8 text-center border border-[#F5C518]/10">
          <div className="grid grid-cols-3 gap-8">
            {STATS.map((s) => (
              <div key={s.label}>
                <div
                  className="text-4xl md:text-5xl font-black text-[#F5C518]"
                  style={{ fontFamily: 'Bebas Neue, sans-serif' }}
                >
                  {s.value}
                </div>
                <div className="text-gray-500 text-sm mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="relative z-10 px-6 pb-32 text-center">
        <div className="glass rounded-3xl p-12 max-w-3xl mx-auto border border-[#F5C518]/10">
          <h2
            className="text-5xl font-black text-white mb-4"
            style={{ fontFamily: 'Bebas Neue, sans-serif' }}
          >
            PRÊT POUR LE COUP D&apos;ENVOI ?
          </h2>
          <p className="text-gray-400 mb-8">La Coupe du Monde commence le 11 juin 2026. Assure-toi d&apos;être là.</p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-[#F5C518] hover:bg-[#ffd700] text-black font-black text-xl px-10 py-5 rounded-2xl transition-all hover:scale-105"
            style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.05em' }}
          >
            🚀 REJOINDRE WORLDSQUAD
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-6 py-8 text-center text-gray-600 text-sm">
        WorldSquad — Built for the World Cup. Gone viral by July. 🏆
      </footer>
    </main>
  )
}

const FEATURES = [
  {
    icon: '⚽',
    title: 'Pronostics',
    desc: '104 matchs à pronostiquer. Score exact, bon vainqueur, buteur — gagne des SquadCoins à chaque bonne prédiction.',
  },
  {
    icon: '🃏',
    title: 'Cartes Collectibles',
    desc: '108 cartes : joueurs, nations, trophées. Rarités Common à Legend avec effets holographiques.',
  },
  {
    icon: '⚔️',
    title: 'Battles',
    desc: 'Défie tes amis en duel de cartes. Mise des coins, choisis ta carte, la meilleure stat gagne.',
  },
  {
    icon: '👥',
    title: 'Groupes Privés',
    desc: 'Crée ta ligue privée avec un code secret. Classements, feed activité en temps réel.',
  },
]

const STATS = [
  { value: '104', label: 'matchs à pronostiquer' },
  { value: '108', label: 'cartes à collectionner' },
  { value: '48', label: 'nations participantes' },
]
