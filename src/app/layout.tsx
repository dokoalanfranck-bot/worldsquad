import type { Metadata, Viewport } from 'next'
import { Bebas_Neue, Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { PWAProvider } from '@/components/PWAProvider'

const bebasNeue = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-bebas', display: 'swap' })
const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700', '800', '900'], variable: '--font-inter', display: 'swap' })

export const metadata: Metadata = {
  title: 'WorldSquad — Vis la Coupe du Monde 2026',
  description: 'La plateforme sociale gamifiée pour vivre la FIFA World Cup 2026 entre amis. Pronostics, cartes collectibles, battles.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/api/icons/192',
    apple: '/api/icons/192',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'WorldSquad',
  },
  formatDetection: { telephone: false },
  openGraph: {
    title: 'WorldSquad',
    description: 'Pronostics · Cartes · Battles · FIFA 2026',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#091524' },
    { media: '(prefers-color-scheme: light)', color: '#091524' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.variable} ${bebasNeue.variable} text-white min-h-screen`} style={{ background: 'var(--bg-primary)', fontFamily: 'var(--font-inter, Inter, sans-serif)' }}>
        {children}
        <PWAProvider />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#12121f',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
            },
            success: {
              iconTheme: { primary: '#F5C518', secondary: '#0A0A0F' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#fff' },
            },
          }}
        />
      </body>
    </html>
  )
}
