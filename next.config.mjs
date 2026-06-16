/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.thesportsdb.com',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://meet.jit.si",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://meet.jit.si",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.thesportsdb.com https://fonts.googleapis.com https://fonts.gstatic.com https://meet.jit.si wss://meet.jit.si",
              "frame-src 'self' https://meet.jit.si https://www.youtube.com https://www.youtube-nocookie.com https://player.twitch.tv",
              "media-src 'self' blob:",
              "worker-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig
