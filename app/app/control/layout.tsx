import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/auth/current-employee";
import { ControlShell } from "@/components/control/control-shell";

export const dynamic = "force-dynamic";

export default async function ControlLayout({ children }: { children: React.ReactNode }) {
  const employee = await getCurrentEmployee();

  if (!employee) {
    redirect("/app/login");
  }

  return <ControlShell employee={employee}>{children}</ControlShell>;
}
