import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";
import { resolvePublicImageUrl } from "@/lib/storage/resolve-public-image-url";

const BUCKET = "employee-avatars";
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxSize = 2 * 1024 * 1024;

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await requireAdmin();
  if (!context.ok) return context.error;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
  }

  if (!allowedTypes.has(file.type)) {
    return NextResponse.json({ error: "Solo se permiten imagenes jpg, png o webp" }, { status: 400 });
  }

  if (file.size > maxSize) {
    return NextResponse.json({ error: "La imagen no debe superar 2MB" }, { status: 400 });
  }

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${params.id}/${Date.now()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await context.admin.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: true
  });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const publicUrl = await resolvePublicImageUrl({ admin: context.admin, bucket: BUCKET, path });
  const patch = {
    profile_photo_path: path,
    profile_photo_url: null,
    profile_photo_updated_at: new Date().toISOString()
  };
  const { error } = await context.admin.from("employees").update(patch).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "upload",
    tableName: "employees",
    recordId: params.id,
    newData: { profile_photo_path: path }
  });

  return NextResponse.json({ path, publicUrl });
}
