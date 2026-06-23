import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";
import { resolvePublicImageUrl } from "@/lib/storage/resolve-public-image-url";

const BUCKET = "landing-assets";
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxSize = 2 * 1024 * 1024;

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await requireAdmin();
  if (!context.ok) return context.error;
  const formData = await request.formData();
  const file = formData.get("file");
  const altText = String(formData.get("altText") ?? "").trim();
  if (!(file instanceof File)) return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
  if (!allowedTypes.has(file.type)) return NextResponse.json({ error: "Solo se permiten imagenes jpg, png o webp" }, { status: 400 });
  if (file.size > maxSize) return NextResponse.json({ error: "La imagen no debe superar 2MB" }, { status: 400 });

  const { data: previous, error: branchError } = await context.admin
    .from("branches").select("id,name,image_path,image_url,image_alt").eq("id", params.id).maybeSingle();
  if (branchError || !previous) return NextResponse.json({ error: branchError?.message ?? "Sede no encontrada" }, { status: 404 });

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `branches/${params.id}/cover-${Date.now()}.${extension}`;
  const { error: uploadError } = await context.admin.storage.from(BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), {
    contentType: file.type,
    upsert: false
  });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const patch = { image_path: path, image_url: null, image_alt: altText || `Sede ${previous.name} de La Bajadita Barber Studio` };
  const { error } = await context.admin.from("branches").update(patch).eq("id", params.id);
  if (error) {
    await context.admin.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (previous.image_path && previous.image_path !== path) await context.admin.storage.from(BUCKET).remove([previous.image_path]);
  const publicUrl = await resolvePublicImageUrl({ admin: context.admin, bucket: BUCKET, path });
  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId, actorRole: context.employee.role, actorBranchId: context.employee.branchId,
    eventType: "upload", tableName: "branches", recordId: params.id,
    previousData: { event: previous.image_path ? "branch_image_updated" : "branch_image_uploaded", image_path: previous.image_path, image_url: previous.image_url },
    newData: { event: previous.image_path ? "branch_image_updated" : "branch_image_uploaded", image_path: path, image_url: publicUrl, image_alt: patch.image_alt }
  });
  return NextResponse.json({ path, publicUrl, imageAlt: patch.image_alt });
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const context = await requireAdmin();
  if (!context.ok) return context.error;
  const { data: previous, error } = await context.admin.from("branches")
    .select("image_path,image_url,image_alt").eq("id", params.id).maybeSingle();
  if (error || !previous) return NextResponse.json({ error: error?.message ?? "Sede no encontrada" }, { status: 404 });
  const { error: updateError } = await context.admin.from("branches")
    .update({ image_path: null, image_url: null }).eq("id", params.id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  if (previous.image_path) await context.admin.storage.from(BUCKET).remove([previous.image_path]);
  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId, actorRole: context.employee.role, actorBranchId: context.employee.branchId,
    eventType: "delete", tableName: "branches", recordId: params.id,
    previousData: { event: "branch_image_deleted", ...previous },
    newData: { event: "branch_image_deleted", image_path: null, image_url: null }
  });
  return NextResponse.json({ ok: true });
}
