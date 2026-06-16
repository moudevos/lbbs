export type AppRole = "admin" | "recepcion" | "barbero";

export type CurrentEmployee = {
  userId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string | null;
  role: AppRole;
  branchId: string | null;
  branchName: string | null;
  branchCode: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
};

export type EmployeeRow = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  role: AppRole;
  branch_id: string | null;
  is_active: boolean;
  must_change_password: boolean;
  branches?: {
    name: string | null;
    code: string | null;
  } | { name: string | null; code: string | null }[] | null;
};
