import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(_req: Request, { params }: { params: { size: string } }) {
  const sizeParam = params.size
  const isMaskable = sizeParam === '512-maskable'
  const isScreenshot = sizeParam === 'screenshot-mobile'

  if (isScreenshot) {
    return new ImageResponse(
      (
        <div
          style={{
            width: 390,
            height: 844,
            background: 'linear-gradient(160deg, #0A0A0F 0%, #0D0D17 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
            fontFamily: 'sans-serif',
          }}
        >
          <div style={{ fontSize: 80, display: 'flex' }}>⚽</div>
          <div style={{ color: '#F5C518', fontSize: 64, fontWeight: 900, letterSpacing: 4 }}>
            WORLDSQUAD
          </div>
          <div style={{ color: '#9CA3AF', fontSize: 22, textAlign: 'center', maxWidth: 300 }}>
            Pronostics · Cartes · Battles · FIFA 2026
          </div>
        </div>
      ),
      { width: 390, height: 844 }
    )
  }

  const size = isMaskable ? 512 : (parseInt(sizeParam) || 192)
  const padding = isMaskable ? size * 0.15 : 0

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          background: isMaskable
            ? '#F5C518'
            : 'linear-gradient(145deg, #0D0D17 0%, #0A0A0F 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding,
          borderRadius: isMaskable ? 0 : size * 0.2,
        }}
      >
        <div
          style={{
            width: size - padding * 2,
            height: size - padding * 2,
            background: isMaskable
              ? 'linear-gradient(145deg, #0D0D17 0%, #0A0A0F 100%)'
              : 'transparent',
            borderRadius: isMaskable ? size * 0.18 : 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: size * 0.04,
          }}
        >
          {/* Soccer ball */}
          <div style={{ fontSize: size * 0.3, lineHeight: 1, display: 'flex' }}>⚽</div>
          {/* WS monogram */}
          <div
            style={{
              color: '#F5C518',
              fontSize: size * 0.22,
              fontWeight: 900,
              letterSpacing: size * 0.01,
              fontFamily: 'sans-serif',
              lineHeight: 1,
            }}
          >
            WS
          </div>
        </div>
      </div>
    ),
    { width: size, height: size }
  )
}
