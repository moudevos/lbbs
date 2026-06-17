import type { SupabaseClient } from "@supabase/supabase-js";

type AdminClient = SupabaseClient<any, "public", any>;

const publicBuckets = new Set(["landing-assets", "branch-gallery", "work-gallery", "service-images"]);

export async function resolvePublicImageUrl({
  admin,
  bucket,
  path,
  fallback = null,
  expiresIn = 60 * 60
}: {
  admin: AdminClient;
  bucket: string;
  path?: string | null;
  fallback?: string | null;
  expiresIn?: number;
}) {
  if (!path) return fallback;
  if (/^https?:\/\//.test(path)) return path;
  if (publicBuckets.has(bucket)) {
    return admin.storage.from(bucket).getPublicUrl(path).data.publicUrl || fallback;
  }
  const signed = await admin.storage.from(bucket).createSignedUrl(path, expiresIn);
  return signed.data?.signedUrl || fallback;
}
