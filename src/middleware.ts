import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED = ['/dashboard', '/matches', '/collection', '/packs', '/battles', '/group', '/leaderboard', '/shop', '/settings', '/profile', '/admin']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Maintenance mode check — exempt: /admin, /maintenance, /login, /signup
  const isMaintenanceExempt =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/maintenance') ||
    pathname === '/login' ||
    pathname === '/signup'

  if (!isMaintenanceExempt) {
    try {
      const { data: setting } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .single()

      const val = setting?.value as { enabled?: boolean; message?: string } | null
      if (val?.enabled) {
        const url = new URL('/maintenance', request.url)
        if (val.message) url.searchParams.set('msg', val.message)
        return NextResponse.redirect(url)
      }
    } catch { /* fail open — never block if DB unreachable */ }
  }

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p))

  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
