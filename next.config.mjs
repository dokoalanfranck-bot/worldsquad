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
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://www.thesportsdb.com https://*.supabase.co",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.thesportsdb.com https://fonts.googleapis.com https://fonts.gstatic.com",
              "frame-src 'none'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig
