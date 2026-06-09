import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { PWAProvider } from '@/components/PWAProvider'

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
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0F' },
    { media: '(prefers-color-scheme: light)', color: '#0A0A0F' },
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-[#0A0A0F] text-white min-h-screen">
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
