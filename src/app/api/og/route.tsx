import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

const RARITY_CONFIG = {
  Common:  { color: '#9CA3AF', emoji: '🃏', label: 'COMMUN' },
  Rare:    { color: '#00D4FF', emoji: '💎', label: 'RARE' },
  Epic:    { color: '#A855F7', emoji: '⚡', label: 'ÉPIQUE' },
  Legend:  { color: '#F5C518', emoji: '🏆', label: 'LÉGENDAIRE' },
}

export async function GET(req: NextRequest) {
  const p = new URL(req.url).searchParams
  const type = p.get('type') ?? 'card'

  if (type === 'card') {
    const name    = p.get('name') ?? 'Joueur'
    const rarity  = p.get('rarity') ?? 'Common'
    const nation  = p.get('nation') ?? ''
    const pseudo  = p.get('pseudo') ?? ''
    const cfg     = RARITY_CONFIG[rarity as keyof typeof RARITY_CONFIG] ?? RARITY_CONFIG.Common

    return new ImageResponse(
      <div style={{
        display: 'flex', width: '1200px', height: '630px',
        background: 'linear-gradient(135deg, #0A0A0F 0%, #13131f 50%, #0b0b18 100%)',
        color: 'white', fontFamily: 'sans-serif', position: 'relative', overflow: 'hidden',
      }}>
        {/* background accent */}
        <div style={{
          position: 'absolute', top: '-80px', left: '-80px',
          width: '500px', height: '500px', borderRadius: '50%',
          background: `${cfg.color}15`,
        }} />
        <div style={{
          position: 'absolute', bottom: '-100px', right: '200px',
          width: '400px', height: '400px', borderRadius: '50%',
          background: `${cfg.color}08`,
        }} />

        {/* left column */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          width: '380px', padding: '40px',
        }}>
          <div style={{ fontSize: '110px', lineHeight: '1' }}>{cfg.emoji}</div>
          <div style={{
            fontSize: '15px', fontWeight: 'bold', color: cfg.color,
            letterSpacing: '4px', textTransform: 'uppercase', marginTop: '20px',
            padding: '8px 24px', borderRadius: '100px',
            background: `${cfg.color}20`,
            border: `1px solid ${cfg.color}60`,
          }}>
            {cfg.label}
          </div>
        </div>

        {/* divider */}
        <div style={{ width: '1px', height: '70%', background: 'rgba(255,255,255,0.06)', alignSelf: 'center' }} />

        {/* right column */}
        <div style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          flex: 1, padding: '60px 70px',
        }}>
          {/* brand */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
            <span style={{ fontSize: '22px', marginRight: '10px' }}>⚽</span>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'rgba(255,255,255,0.3)', letterSpacing: '3px' }}>
              WORLDSQUAD 2026
            </span>
          </div>

          {/* name */}
          <div style={{
            fontSize: '76px', fontWeight: '900', lineHeight: '0.95',
            letterSpacing: '-1px', marginBottom: '16px',
          }}>
            {name}
          </div>

          {/* nation */}
          {nation && (
            <div style={{ fontSize: '26px', color: 'rgba(255,255,255,0.55)', marginBottom: '28px' }}>
              {nation}
            </div>
          )}

          {/* obtained by */}
          <div style={{ fontSize: '18px', color: 'rgba(255,255,255,0.35)', marginBottom: '28px' }}>
            Obtenu par{' '}
            <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 'bold' }}>{pseudo}</span>
          </div>

          {/* CTA */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#F5C518', borderRadius: '12px', padding: '14px 28px',
            width: '240px',
          }}>
            <span style={{ fontSize: '16px', fontWeight: '900', color: '#000', letterSpacing: '0.5px' }}>
              Rejoins l'aventure →
            </span>
          </div>

          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.18)', marginTop: '14px' }}>
            worldsquad.vercel.app
          </div>
        </div>
      </div>,
      { width: 1200, height: 630 }
    )
  }

  if (type === 'battle') {
    const winner = p.get('winner') ?? 'Champion'
    const loser  = p.get('loser')  ?? 'Adversaire'
    const card   = p.get('card')   ?? ''
    const rarity = p.get('rarity') ?? 'Common'
    const score  = p.get('score')  ?? ''
    const cfg    = RARITY_CONFIG[rarity as keyof typeof RARITY_CONFIG] ?? RARITY_CONFIG.Common

    return new ImageResponse(
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        width: '1200px', height: '630px',
        background: 'linear-gradient(135deg, #0A0A0F 0%, #0f0f20 100%)',
        color: 'white', fontFamily: 'sans-serif', position: 'relative', overflow: 'hidden',
      }}>
        {/* red glow left */}
        <div style={{
          position: 'absolute', top: '-100px', left: '-100px',
          width: '500px', height: '500px', borderRadius: '50%',
          background: '#F5C51815',
        }} />

        {/* brand */}
        <div style={{ display: 'flex', alignItems: 'center', position: 'absolute', top: '32px', left: '48px' }}>
          <span style={{ fontSize: '20px', marginRight: '8px' }}>⚽</span>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'rgba(255,255,255,0.3)', letterSpacing: '3px' }}>
            WORLDSQUAD 2026
          </span>
        </div>

        {/* main content */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '4px' }}>⚔️</div>

          <div style={{
            fontSize: '88px', fontWeight: '900', lineHeight: '1',
            color: '#F5C518', letterSpacing: '-2px', marginBottom: '8px',
          }}>
            VICTOIRE !
          </div>

          {/* versus */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
            <span style={{ fontSize: '32px', fontWeight: 'bold', color: 'white' }}>{winner}</span>
            <span style={{ fontSize: '20px', color: 'rgba(255,255,255,0.3)', margin: '0 20px' }}>bat</span>
            <span style={{ fontSize: '32px', fontWeight: 'bold', color: 'rgba(255,255,255,0.4)' }}>{loser}</span>
            {score && (
              <span style={{ fontSize: '24px', color: '#F5C518', marginLeft: '16px', fontWeight: '900' }}>
                ({score})
              </span>
            )}
          </div>

          {/* stolen card */}
          {card && (
            <div style={{
              display: 'flex', alignItems: 'center',
              background: `${cfg.color}18`, border: `1px solid ${cfg.color}40`,
              borderRadius: '12px', padding: '12px 28px',
            }}>
              <span style={{ fontSize: '22px', marginRight: '12px' }}>{cfg.emoji}</span>
              <span style={{ fontSize: '20px', color: 'rgba(255,255,255,0.7)', marginRight: '8px' }}>
                Carte volée :
              </span>
              <span style={{ fontSize: '22px', fontWeight: '900', color: cfg.color }}>
                {card}
              </span>
              <span style={{
                fontSize: '13px', fontWeight: 'bold', color: cfg.color,
                marginLeft: '12px', padding: '3px 10px',
                background: `${cfg.color}20`, borderRadius: '100px',
              }}>
                {cfg.label}
              </span>
            </div>
          )}
        </div>

        {/* bottom CTA */}
        <div style={{
          position: 'absolute', bottom: '36px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <div style={{
            fontSize: '15px', fontWeight: 'bold', color: 'rgba(255,255,255,0.35)', letterSpacing: '1px',
          }}>
            Affronte-moi sur worldsquad.vercel.app
          </div>
        </div>
      </div>,
      { width: 1200, height: 630 }
    )
  }

  // type === 'supporter'
  const pseudo    = p.get('pseudo')    ?? 'Fan'
  const nation    = p.get('nation')    ?? 'World'
  const flag      = p.get('flag')      ?? '🌍'
  const preds     = p.get('preds')     ?? '0'
  const wins      = p.get('wins')      ?? '0'
  const cards     = p.get('cards')     ?? '0'
  const streak    = p.get('streak')    ?? '0'

  return new ImageResponse(
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      width: '630px', height: '1000px',
      background: 'linear-gradient(160deg, #0A0A0F 0%, #13131f 60%, #0c0c1a 100%)',
      color: 'white', fontFamily: 'sans-serif', position: 'relative', overflow: 'hidden',
    }}>
      {/* top gold bar */}
      <div style={{ width: '100%', height: '6px', background: 'linear-gradient(90deg, #F5C518, #ffd700, #F5C518)' }} />

      {/* background circle */}
      <div style={{
        position: 'absolute', top: '100px', left: '50%',
        width: '400px', height: '400px', borderRadius: '50%',
        background: '#F5C51808',
        transform: 'translateX(-50%)',
      }} />

      {/* WorldSquad brand */}
      <div style={{ display: 'flex', alignItems: 'center', marginTop: '32px' }}>
        <span style={{ fontSize: '20px', marginRight: '8px' }}>⚽</span>
        <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'rgba(255,255,255,0.3)', letterSpacing: '3px' }}>
          WORLDSQUAD 2026
        </span>
      </div>

      {/* flag */}
      <div style={{ fontSize: '110px', lineHeight: '1', marginTop: '40px' }}>{flag}</div>

      {/* pseudo */}
      <div style={{
        fontSize: '52px', fontWeight: '900', letterSpacing: '-1px',
        marginTop: '28px', lineHeight: '1',
      }}>
        {pseudo.toUpperCase()}
      </div>

      {/* nation */}
      <div style={{
        fontSize: '16px', fontWeight: 'bold', color: '#F5C518',
        letterSpacing: '4px', textTransform: 'uppercase', marginTop: '10px',
      }}>
        SUPPORTER · {nation.toUpperCase()}
      </div>

      {/* divider */}
      <div style={{
        width: '80px', height: '2px', background: 'rgba(255,255,255,0.1)',
        marginTop: '36px',
      }} />

      {/* stats */}
      <div style={{
        display: 'flex', marginTop: '36px',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px', overflow: 'hidden',
        width: '480px',
      }}>
        {[
          { label: 'PRONOS', value: preds, emoji: '🎯' },
          { label: 'VICTOIRES', value: wins, emoji: '⚔️' },
          { label: 'CARTES', value: cards, emoji: '🃏' },
          { label: 'SÉRIE', value: streak, emoji: '🔥' },
        ].map((stat, i) => (
          <div key={i} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            flex: 1, padding: '20px 12px',
            borderRight: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none',
            background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
          }}>
            <span style={{ fontSize: '24px', marginBottom: '6px' }}>{stat.emoji}</span>
            <span style={{ fontSize: '30px', fontWeight: '900', color: '#F5C518', lineHeight: '1' }}>{stat.value}</span>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '4px', letterSpacing: '1px' }}>{stat.label}</span>
          </div>
        ))}
      </div>

      {/* badge */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#F5C518', borderRadius: '100px',
        padding: '12px 32px', marginTop: '36px',
      }}>
        <span style={{ fontSize: '15px', fontWeight: '900', color: '#000', letterSpacing: '1px' }}>
          🌍 Rejoins l'aventure WorldSquad
        </span>
      </div>

      {/* footer */}
      <div style={{
        fontSize: '13px', color: 'rgba(255,255,255,0.2)',
        marginTop: '16px', letterSpacing: '1px',
      }}>
        worldsquad.vercel.app
      </div>
    </div>,
    { width: 630, height: 1000 }
  )
}
