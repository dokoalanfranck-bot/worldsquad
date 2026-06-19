import { createAdminClient } from './supabase/admin'

interface AuditParams {
  adminId: string
  adminPseudo: string
  action: string
  targetUserId?: string | null
  targetPseudo?: string | null
  metadata?: Record<string, unknown>
}

export async function logAudit(p: AuditParams): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('super_admin_audit_log').insert({
      admin_id: p.adminId,
      admin_pseudo: p.adminPseudo,
      action: p.action,
      target_user_id: p.targetUserId ?? null,
      target_pseudo: p.targetPseudo ?? null,
      metadata: p.metadata ?? {},
    })
  } catch {
    // Non-bloquant : l'audit ne doit jamais faire échouer l'action principale
  }
}
