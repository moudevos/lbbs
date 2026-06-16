import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { CurrentEmployee, EmployeeRow } from "./types";

function mapEmployee(userId: string, employee: EmployeeRow): CurrentEmployee {
  const branch = Array.isArray(employee.branches) ? employee.branches[0] : employee.branches;

  return {
    userId,
    employeeId: employee.id,
    firstName: employee.first_name,
    lastName: employee.last_name,
    fullName: `${employee.first_name} ${employee.last_name}`.trim(),
    email: employee.email,
    role: employee.role,
    branchId: employee.branch_id,
    branchName: branch?.name ?? null,
    branchCode: branch?.code ?? null,
    isActive: employee.is_active,
    mustChangePassword: employee.must_change_password
  };
}

export async function getCurrentEmployee(supabaseClient?: SupabaseClient): Promise<CurrentEmployee | null> {
  const supabase = supabaseClient ?? createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return null;
  }

  const { data, error } = await supabase
    .from("employees")
    .select("id,user_id,first_name,last_name,email,role,branch_id,is_active,must_change_password,branches(name,code)")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapEmployee(userData.user.id, data as unknown as EmployeeRow);
}
