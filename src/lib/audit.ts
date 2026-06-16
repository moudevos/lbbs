import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppRole } from "./auth/types";

type AuditInput = {
  actorUserId?: string | null;
  actorRole?: AppRole | null;
  actorBranchId?: string | null;
  eventType: "login" | "logout" | "create" | "update" | "delete" | "status_change" | "payment" | "upload";
  tableName: string;
  recordId?: string | null;
  previousData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function writeAuditLog(supabase: SupabaseClient, input: AuditInput) {
  await supabase.from("audit_logs").insert({
    actor_user_id: input.actorUserId ?? null,
    actor_role: input.actorRole ?? null,
    actor_branch_id: input.actorBranchId ?? null,
    event_type: input.eventType,
    table_name: input.tableName,
    record_id: input.recordId ?? null,
    previous_data: input.previousData ?? null,
    new_data: input.newData ?? null,
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null
  });
}
