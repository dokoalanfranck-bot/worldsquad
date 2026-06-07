import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openPack } from '@/lib/packs'
import { PACK_CONFIGS } from '@/types'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { packType } = await req.json() as { packType: keyof typeof PACK_CONFIGS }
  if (!PACK_CONFIGS[packType]) return NextResponse.json({ error: 'Invalid pack type' }, { status: 400 })

  const { cards, error } = await openPack(user.id, packType)
  if (error) return NextResponse.json({ error }, { status: 500 })

  return NextResponse.json({ cards })
}
