import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dedupeById } from "@/lib/utils/dedupe-by-id";
import { resolvePublicImageUrl } from "@/lib/storage/resolve-public-image-url";

const BUCKET = "employee-avatars";

export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("employees")
    .select("id,first_name,last_name,nickname,specialty,profile_photo_path,profile_photo_url,branch_id,branches(name)")
    .eq("is_active", true)
    .eq("role", "barbero")
    .order("first_name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const team = await Promise.all(dedupeById(data ?? []).map(async (employee) => {
      const branch = Array.isArray(employee.branches) ? employee.branches[0] : employee.branches;
      const resolvedUrl = await resolvePublicImageUrl({
        admin,
        bucket: BUCKET,
        path: employee.profile_photo_path,
        fallback: employee.profile_photo_url
      });
      return {
        id: employee.id,
        nickname: employee.nickname || null,
        fullName: `${employee.first_name ?? ""} ${employee.last_name ?? ""}`.trim(),
        specialty: employee.specialty || "Barbero profesional",
        branchId: employee.branch_id,
        branchName: branch?.name ?? null,
        profilePhotoUrl: resolvedUrl,
        profilePhotoPath: employee.profile_photo_path || null
      };
    }));

  return NextResponse.json({ team });
}
