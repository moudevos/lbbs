export const landingSocialLinks = {
  facebook: process.env.NEXT_PUBLIC_FACEBOOK_URL?.trim() || "",
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL?.trim() || "",
  tiktok: process.env.NEXT_PUBLIC_TIKTOK_URL?.trim() || ""
};

export function socialHref(url: string) {
  return url || "#";
}
