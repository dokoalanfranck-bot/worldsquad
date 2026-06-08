import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, welcomeEmailHtml } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { to, pseudo } = await req.json()
    if (!to || !pseudo) {
      return NextResponse.json({ error: 'to et pseudo requis' }, { status: 400 })
    }

    await sendEmail({
      to,
      subject: `Bienvenue sur WorldSquad, ${pseudo} !`,
      html: welcomeEmailHtml(pseudo),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Email error:', err)
    return NextResponse.json({ error: 'Erreur envoi email' }, { status: 500 })
  }
}
