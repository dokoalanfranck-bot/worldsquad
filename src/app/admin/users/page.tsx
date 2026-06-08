import { createAdminClient } from '@/lib/supabase/admin'
import { UsersClient } from './UsersClient'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

interface SearchParams {
  search?: string
  page?: string
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const supabase = createAdminClient()

  const page = parseInt(searchParams.page ?? '1') || 1
  const search = searchParams.search ?? ''
  const offset = (page - 1) * PAGE_SIZE

  let query = supabase
    .from('users')
    .select('id, pseudo, email, nation, coins, level, is_vip, is_admin, predictions_correct, battles_won, created_at', { count: 'exact' })

  if (search) {
    query = query.ilike('pseudo', `%${search}%`)
  }

  const { data: users, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <UsersClient
      users={users ?? []}
      totalCount={count ?? 0}
      currentPage={page}
      totalPages={totalPages}
      currentSearch={search}
    />
  )
}
