import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin, requireEmployee } from "@/lib/control/api";
import { nextCode } from "@/lib/control/codes";
import { writeAuditLog } from "@/lib/audit";
import { resolvePublicImageUrl } from "@/lib/storage/resolve-public-image-url";

export async function GET() {
  const context = await requireEmployee();
  if (!context.ok) return context.error;

  let query = context.admin.from("branches").select("id,code,name,address,phone,image_path,image_url,image_alt,is_active").order("code");
  if (context.employee.role !== "admin" && context.employee.branchId) {
    query = query.eq("id", context.employee.branchId);
  }
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const branches = await Promise.all((data ?? []).map(async (branch) => ({
    ...branch,
    image_url: await resolvePublicImageUrl({
      admin: context.admin,
      bucket: "landing-assets",
      path: branch.image_path,
      fallback: branch.image_url
    })
  })));
  return NextResponse.json({ branches });
}

export async function POST(request: NextRequest) {
  const context = await requireAdmin();
  if (!context.ok) return context.error;
  const body = await request.json();
  if (!body.name) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const code = await nextCode(context.admin, "branches", "code", "SED", 3);
  const { data, error } = await context.admin
    .from("branches")
    .insert({ code, name: body.name, address: body.address ?? null, phone: body.phone ?? null })
    .select("id,code")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "create",
    tableName: "branches",
    recordId: data.id,
    newData: { code, name: body.name }
  });
  return NextResponse.json({ branch: data });
}
