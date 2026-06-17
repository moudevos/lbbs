import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export const MAIN_BRANCH_CODE = "SED-002";

export type PublicContact = {
  branchId: string | null;
  branchCode: string | null;
  branchName: string | null;
  phone: string | null;
};

export async function getMainContact(admin: SupabaseClient = createAdminClient()): Promise<PublicContact> {
  const { data } = await admin
    .from("branches")
    .select("id,code,name,phone")
    .eq("is_active", true)
    .eq("code", MAIN_BRANCH_CODE)
    .maybeSingle();

  return {
    branchId: data?.id ?? null,
    branchCode: data?.code ?? null,
    branchName: data?.name ?? null,
    phone: data?.phone ?? null
  };
}

