'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Video, X, Copy, Check, Clock, ChevronRight, Mic } from 'lucide-react'
import toast from 'react-hot-toast'

interface ScriptLine {
  type: 'direction' | 'speech' | 'pause'
  text: string
}

interface AdScript {
  id: number
  title: string
  subtitle: string
  tone: string
  toneColor: string
  toneBg: string
  duration: string
  description: string
  lines: ScriptLine[]
}

const SCRIPTS: AdScript[] = [
  {
    id: 1,
    title: "C'est quoi WorldSquad ?",
    subtitle: 'Script de présentation — le hook parfait pour déclencher les inscriptions',
    tone: 'Énergique',
    toneColor: 'text-blue-400',
    toneBg: 'bg-blue-500/15 border-blue-500/30',
    duration: '~58 sec',
    description: "Ouvre sur un contraste fort (regarder vs jouer), présente les cartes comme le cœur du jeu, la compétition entre amis comme le moteur social, et les pronostics comme le moyen d'accéder aux packs — pas comme le produit principal.",
    lines: [
      { type: 'direction', text: "Regard direct caméra — ton confidentiel, comme si tu révèles quelque chose que les autres ne savent pas encore" },
      { type: 'speech', text: "La Coupe du Monde 2026 — tout le monde va la regarder. Mais il y en a qui vont vraiment jouer dedans." },
      { type: 'pause', text: '' },
      { type: 'speech', text: "Je te présente WorldSquad." },
      { type: 'pause', text: '' },
      { type: 'direction', text: "Ton dynamique, enthousiaste — comme si tu montrais quelque chose d'incroyable à un ami" },
      { type: 'speech', text: "C'est un jeu de cartes collectibles autour du Mondial. Tu ouvres des packs pour débloquer les meilleurs joueurs du monde — Mbappé, Messi, Vinicius, Bellingham — avec leurs vraies photos et leurs vraies stats. Quatre raretés, dont la Légendaire." },
      { type: 'pause', text: '' },
      { type: 'direction', text: "Montrer l'écran du téléphone — démo visuelle si possible" },
      { type: 'speech', text: "Tu construis ta collection. Tu rejoins une ligue privée avec tes amis — et tu les défies en battle. Ta carte contre la leur. La meilleure stat l'emporte." },
      { type: 'pause', text: '' },
      { type: 'direction', text: "Ton naturel, décontracté — pas de pression" },
      { type: 'speech', text: "Pour ouvrir des packs, tu gagnes des coins en jouant les scores des matchs du Mondial. C'est gratuit. Ça prend dix secondes." },
      { type: 'pause', text: '' },
      { type: 'direction', text: "Sourire franc — pointer vers le bas pour le lien en bio" },
      { type: 'speech', text: "500 coins offerts à l'inscription. Le lien est en bio — rejoins maintenant. La Coupe du Monde attend pas." },
    ],
  },
  {
    id: 2,
    title: 'Ouvre ton premier pack',
    subtitle: "L'angle collector pur — l'expérience d'ouverture",
    tone: 'Enthousiaste',
    toneColor: 'text-purple-400',
    toneBg: 'bg-purple-500/15 border-purple-500/30',
    duration: '~53 sec',
    description: "Script centré 100% sur les cartes et l'ouverture de packs. Cible les fans FIFA FUT, Panini, jeux de cartes.",
    lines: [
      { type: 'direction', text: "Enthousiaste — comme si tu montrais quelque chose d'incroyable à un ami" },
      { type: 'speech', text: "Tu connais ce feeling quand tu ouvres un Panini et que tu tombes sur la carte que tu cherchais depuis des semaines ?" },
      { type: 'pause', text: '' },
      { type: 'speech', text: "Sur WorldSquad, c'est ça tous les jours." },
      { type: 'pause', text: '' },
      { type: 'speech', text: "Plus de 1200 cartes joueurs de la Coupe du Monde 2026. Avec les vraies photos. Quatre niveaux de rareté : Common, Rare, Epic... et la Légendaire." },
      { type: 'direction', text: "Mimez l'ouverture d'un pack avec les mains — expression de choc/joie" },
      { type: 'speech', text: "Quand tu tombes sur une carte Légendaire — les effets, les particules, la musique — t'as envie de montrer ça à tout le monde." },
      { type: 'pause', text: '' },
      { type: 'speech', text: "Tu construis ta collection. Tu défies tes amis en battle avec tes cartes — la meilleure stat gagne. Et dans ta ligue privée, tout le monde voit qui a la collection la plus dingue." },
      { type: 'pause', text: '' },
      { type: 'direction', text: "Direct caméra — pointer vers le bas" },
      { type: 'speech', text: "WorldSquad. Gratuit. 500 coins offerts. Ouvre ton premier pack — le lien est en bio." },
    ],
  },
  {
    id: 3,
    title: 'La collection entre potes',
    subtitle: "L'angle social — collections et battles entre amis",
    tone: 'Décontracté',
    toneColor: 'text-green-400',
    toneBg: 'bg-green-500/15 border-green-500/30',
    duration: '~57 sec',
    description: "Cible les groupes d'amis. La collection comme terrain de jeu commun, les battles comme défis directs.",
    lines: [
      { type: 'direction', text: "Décontracté, comme si tu parles à un ami proche — sourire naturel" },
      { type: 'speech', text: "Imagine un groupe WhatsApp avec tes potes... mais dans ce groupe, vous collectionnez des cartes de joueurs de la Coupe du Monde, et vous vous battez en duel." },
      { type: 'pause', text: '' },
      { type: 'speech', text: "C'est WorldSquad." },
      { type: 'pause', text: '' },
      { type: 'speech', text: "Chacun ouvre ses packs, construit sa collection — Mbappé, Ronaldo, Bellingham, Vinicius. Et quand t'es prêt, tu lances un battle. Tu poses ta meilleure carte, ton pote pose la sienne. La stat la plus haute l'emporte." },
      { type: 'direction', text: "Ton qui monte légèrement" },
      { type: 'speech', text: "Et pour avoir des coins et ouvrir plus de packs ? Tu joues les scores des matchs du Mondial. Ça prend 10 secondes par match et ça te donne du carburant pour agrandir ta collection." },
      { type: 'pause', text: '' },
      { type: 'direction', text: "Ton affirmé — pointer vers soi" },
      { type: 'speech', text: "À la fin du Mondial, qui a la meilleure collection dans votre groupe ? C'est lui le boss." },
      { type: 'pause', text: '' },
      { type: 'speech', text: "Gratuit. 30 secondes pour s'inscrire. 500 coins offerts. Fais-le." },
    ],
  },
  {
    id: 4,
    title: 'Le FIFA mais en mieux',
    subtitle: "L'angle gaming — comparaison FUT / jeux de cartes",
    tone: 'Compétitif',
    toneColor: 'text-orange-400',
    toneBg: 'bg-orange-500/15 border-orange-500/30',
    duration: '~56 sec',
    description: "Cible les gamers, fans de FIFA FUT et jeux de cartes. Positionner WorldSquad comme l'alternative gratuite et sociale.",
    lines: [
      { type: 'direction', text: "Confiant, légèrement provoc — comme si tu révèles un secret" },
      { type: 'speech', text: "T'as déjà dépensé des euros dans FIFA Ultimate Team pour avoir une belle équipe... et au final tu joues tout seul contre des inconnus ?" },
      { type: 'pause', text: '' },
      { type: 'direction', text: "Sourire complice" },
      { type: 'speech', text: "Il y a mieux. WorldSquad." },
      { type: 'pause', text: '' },
      { type: 'speech', text: "C'est un jeu de cartes collectibles autour de la Coupe du Monde 2026. Tu ouvres des packs pour débloquer les meilleurs joueurs du monde — avec de vraies photos, de vraies stats. Quatre raretés dont les cartes Légendaires." },
      { type: 'pause', text: '' },
      { type: 'speech', text: "Et surtout — tu joues contre tes amis. Dans ta ligue privée. Battle direct : ta carte contre la sienne. La meilleure stat gagne." },
      { type: 'direction', text: "Ton ferme" },
      { type: 'speech', text: "Tout ça, sans dépenser un seul euro. Tu gagnes tes coins en jouant les matchs du Mondial. La collection, t'as juste à la construire." },
      { type: 'pause', text: '' },
      { type: 'direction', text: "Direct — pointer vers le bas" },
      { type: 'speech', text: "500 coins offerts à l'inscription. Le lien est en bio." },
    ],
  },
  {
    id: 5,
    title: 'Ta carte Légendaire t\'attend',
    subtitle: "L'angle FOMO — collection déjà en cours",
    tone: 'Urgent',
    toneColor: 'text-red-400',
    toneBg: 'bg-red-500/15 border-red-500/30',
    duration: '~50 sec',
    description: "Crée l'urgence autour de la collection — à utiliser proche du 11 juin. Les autres ont déjà leurs cartes.",
    lines: [
      { type: 'direction', text: "Sérieux, regard direct — debout, cadrage serré" },
      { type: 'speech', text: "En ce moment, pendant que tu regardes cette vidéo..." },
      { type: 'pause', text: '' },
      { type: 'speech', text: "Des milliers de joueurs ouvrent des packs sur WorldSquad. Ils collectionnent Mbappé, Messi, Bellingham. Ils construisent leurs collections pour la Coupe du Monde 2026." },
      { type: 'direction', text: "Ton qui monte — regard dans les yeux" },
      { type: 'speech', text: "Et toi t'as encore rien." },
      { type: 'pause', text: '' },
      { type: 'speech', text: "WorldSquad, c'est le jeu de cartes collectibles de la Coupe du Monde. Tu ouvres des packs, tu tombes sur des Légendaires, tu défies tes amis en battle avec tes cartes." },
      { type: 'pause', text: '' },
      { type: 'direction', text: "Plus calme, confidentiel" },
      { type: 'speech', text: "Les premières semaines, c'est là où tu construis la meilleure collection. Avant que tout le monde ait les mêmes cartes." },
      { type: 'pause', text: '' },
      { type: 'direction', text: "Direct, percutant — pointer vers le bas" },
      { type: 'speech', text: "Gratuit. 500 coins offerts. Le lien est en bio. Maintenant." },
    ],
  },
]

function ScriptModal({ script, onClose }: { script: AdScript; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  const speechOnly = script.lines
    .filter((l) => l.type === 'speech')
    .map((l) => l.text)
    .join('\n\n')

  function copyScript() {
    navigator.clipboard.writeText(speechOnly)
    setCopied(true)
    toast.success('Script copié !')
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{ background: 'var(--bg-elevated, #0D1B2A)' }}
      >
        {/* Stripe */}
        <div className="h-1 w-full flex-shrink-0" style={{ background: 'linear-gradient(90deg, #C8102E, #F5C518)' }} />

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 flex-shrink-0 border-b border-white/5">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${script.toneBg} ${script.toneColor}`}>
                {script.tone}
              </span>
              <span className="flex items-center gap-1 text-white/30 text-[10px] font-semibold">
                <Clock size={10} /> {script.duration}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
              {script.title}
            </h2>
            <p className="text-white/30 text-xs mt-1">{script.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Script body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {script.lines.map((line, i) => {
            if (line.type === 'direction') {
              return (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20 mt-2 flex-shrink-0" />
                  <p className="text-white/35 text-xs italic leading-relaxed">[ {line.text} ]</p>
                </div>
              )
            }
            if (line.type === 'pause') {
              return (
                <div key={i} className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px bg-white/5" />
                  <div className="flex gap-1">
                    <div className="w-1 h-1 rounded-full bg-white/15" />
                    <div className="w-1 h-1 rounded-full bg-white/10" />
                    <div className="w-1 h-1 rounded-full bg-white/5" />
                  </div>
                  <div className="flex-1 h-px bg-white/5" />
                </div>
              )
            }
            // speech
            return (
              <p key={i} className="text-white text-base sm:text-lg leading-relaxed font-medium">
                {line.text}
              </p>
            )
          })}

          {/* Mic tip */}
          <div className="mt-6 p-4 rounded-xl bg-white/3 border border-white/5 flex items-start gap-3">
            <Mic size={14} className="text-white/25 flex-shrink-0 mt-0.5" />
            <p className="text-white/25 text-xs leading-relaxed">
              Conseil : lis le script à voix haute 2-3 fois avant de filmer. Les pauses (···) = respiration naturelle. Les directions en gris = indications de jeu, ne pas lire.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/5 flex gap-3 flex-shrink-0">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={copyScript}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-sm border transition-all"
            style={{
              fontFamily: 'Bebas Neue, sans-serif',
              background: copied ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
              borderColor: copied ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)',
              color: copied ? '#4ade80' : '#fff',
            }}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'COPIÉ !' : 'COPIER LE TEXTE'}
          </motion.button>
          <button
            onClick={onClose}
            className="px-6 py-3.5 rounded-xl font-black text-sm text-white/40 bg-white/5 hover:bg-white/10 transition-colors"
            style={{ fontFamily: 'Bebas Neue, sans-serif' }}
          >
            FERMER
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function PubClient() {
  const [selected, setSelected] = useState<AdScript | null>(null)

  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl bg-[#F5C518]/15 flex items-center justify-center">
            <Video size={22} className="text-[#F5C518]" />
          </div>
          <div>
            <h1 className="text-5xl font-black text-white leading-none" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
              ESPACE PUB
            </h1>
            <p className="text-white/30 text-xs mt-0.5">Scripts vidéo · 1 minute max</p>
          </div>
        </div>
        <p className="text-white/40 text-sm mt-3 max-w-xl">
          {SCRIPTS.length} scripts prêts à tourner. Chaque script inclut les indications de mise en scène et le texte à dire.
          Clique sur une vidéo pour lire le script complet.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Scripts disponibles', value: SCRIPTS.length, color: 'text-[#F5C518]' },
          { label: 'Durée moyenne', value: '~54s', color: 'text-green-400' },
          { label: 'Angles couverts', value: '5', color: 'text-purple-400' },
        ].map((s) => (
          <div key={s.label} className="glass rounded-xl p-4 border border-white/5 text-center">
            <p className={`font-black text-2xl leading-none ${s.color}`} style={{ fontFamily: 'Bebas Neue, sans-serif' }}>{s.value}</p>
            <p className="text-white/30 text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Script cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SCRIPTS.map((script, i) => (
          <motion.div
            key={script.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelected(script)}
            className="glass rounded-2xl p-5 border border-white/5 hover:border-white/15 cursor-pointer transition-all group relative overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.02)' }}
          >
            {/* Subtle gradient glow on hover */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-2xl"
              style={{ background: `radial-gradient(ellipse at top left, ${script.toneBg.includes('blue') ? 'rgba(59,130,246,0.06)' : script.toneBg.includes('green') ? 'rgba(34,197,94,0.06)' : script.toneBg.includes('purple') ? 'rgba(168,85,247,0.06)' : script.toneBg.includes('orange') ? 'rgba(249,115,22,0.06)' : 'rgba(239,68,68,0.06)'}, transparent 70%)` }}
            />

            {/* Top row */}
            <div className="flex items-start justify-between mb-4">
              {/* Number badge */}
              <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                <span className="font-black text-white/40 text-base" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                  {String(script.id).padStart(2, '0')}
                </span>
              </div>
              {/* Tone + duration */}
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${script.toneBg} ${script.toneColor}`}>
                  {script.tone}
                </span>
                <span className="flex items-center gap-0.5 text-white/20 text-[10px]">
                  <Clock size={9} /> {script.duration}
                </span>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-white font-black text-xl leading-tight mb-1" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
              {script.title}
            </h3>
            <p className="text-white/35 text-xs mb-3">{script.subtitle}</p>

            {/* Description */}
            <p className="text-white/25 text-xs leading-relaxed mb-4 line-clamp-2">
              {script.description}
            </p>

            {/* Preview — first speech line */}
            <div className="bg-white/3 rounded-xl p-3 mb-4 border border-white/5">
              <p className="text-white/50 text-xs leading-relaxed line-clamp-2 italic">
                &ldquo;{script.lines.find((l) => l.type === 'speech')?.text}&rdquo;
              </p>
            </div>

            {/* CTA */}
            <div className={`flex items-center justify-between ${script.toneColor} group-hover:opacity-100 opacity-70 transition-opacity`}>
              <span className="text-xs font-black uppercase tracking-wider" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                Voir le script
              </span>
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Pro tips section */}
      <div className="mt-10 glass rounded-2xl p-6 border border-white/5">
        <h2 className="text-white font-black text-xl mb-4" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
          CONSEILS AVANT DE TOURNER
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { emoji: '💡', title: 'Éclairage', tip: "Fenêtre devant toi, pas derrière. Lumière naturelle = qualité pro gratuite." },
            { emoji: '🎤', title: 'Audio', tip: "Parle à 30 cm du micro. Ferme la fenêtre. Un casque avec micro intégré suffit." },
            { emoji: '📱', title: 'Cadrage', tip: "Portrait pour Reels/TikTok/Stories. Cadre du buste à la tête, laisse un peu d'espace au-dessus." },
            { emoji: '🔁', title: 'Répétition', tip: "Lis le script 3x à voix haute avant de filmer. La 4e prise est toujours la meilleure." },
            { emoji: '👀', title: 'Regard', tip: "Regarde l'objectif de la caméra, pas l'écran. Colle un post-it à côté de la caméra si besoin." },
            { emoji: '✂️', title: 'Montage', tip: "Laisse 2 secondes de silence au début et à la fin. Facilite le montage et les coupes." },
          ].map((tip) => (
            <div key={tip.title} className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0 mt-0.5">{tip.emoji}</span>
              <div>
                <p className="text-white font-bold text-sm">{tip.title}</p>
                <p className="text-white/35 text-xs leading-relaxed">{tip.tip}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Script modal */}
      <AnimatePresence>
        {selected && (
          <ScriptModal script={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
