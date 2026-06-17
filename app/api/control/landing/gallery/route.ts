import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";
import { resolvePublicImageUrl } from "@/lib/storage/resolve-public-image-url";

const BUCKET = "landing-assets";
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxSize = 2 * 1024 * 1024;

export async function GET() {
  const context = await requireAdmin();
  if (!context.ok) return context.error;

  const { data, error } = await context.admin
    .from("landing_assets")
    .select("id,title,description,service_name,barber_name,image_path,path,alt_text,is_active,sort_order,featured,created_at")
    .eq("asset_type", "work_gallery")
    .order("sort_order")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = await Promise.all((data ?? []).map(async (item) => ({
    ...item,
    image_url: await resolvePublicImageUrl({
      admin: context.admin,
      bucket: BUCKET,
      path: item.image_path || item.path
    })
  })));
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const context = await requireAdmin();
  if (!context.ok) return context.error;

  const formData = await request.formData();
  const file = formData.get("file");
  const title = String(formData.get("title") ?? "").trim();
  if (!(file instanceof File)) return NextResponse.json({ error: "Imagen requerida" }, { status: 400 });
  if (!title) return NextResponse.json({ error: "Titulo requerido" }, { status: 400 });
  if (!allowedTypes.has(file.type)) return NextResponse.json({ error: "Solo se permiten imagenes jpg, png o webp" }, { status: 400 });
  if (file.size > maxSize) return NextResponse.json({ error: "La imagen no debe superar 2MB" }, { status: 400 });

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `work-gallery/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await context.admin.storage.from(BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), {
    contentType: file.type,
    upsert: false
  });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const record = {
    asset_type: "work_gallery",
    path,
    image_path: path,
    title,
    description: String(formData.get("description") ?? "").trim() || null,
    service_name: String(formData.get("serviceName") ?? "").trim() || null,
    barber_name: String(formData.get("barberName") ?? "").trim() || null,
    alt_text: String(formData.get("altText") ?? "").trim() || null,
    sort_order: Number(formData.get("sortOrder") ?? 0) || 0,
    featured: formData.get("featured") === "true",
    is_active: formData.get("isActive") !== "false"
  };
  const { data, error } = await context.admin.from("landing_assets").insert(record).select("id").single();
  if (error) {
    await context.admin.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "upload",
    tableName: "landing_assets",
    recordId: data.id,
    newData: { ...record, path }
  });
  return NextResponse.json({ id: data.id }, { status: 201 });
}

