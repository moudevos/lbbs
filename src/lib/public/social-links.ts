export type PublicSocialLinks = {
  instagram: string;
  tiktok: string;
  facebook: string;
  whatsapp: string;
};

export const publicSocialLinks: PublicSocialLinks = {
  instagram: "",
  tiktok: "",
  facebook: "",
  whatsapp: ""
};

export function resolvePublicSocialLinks(links: string[], whatsappUrl = ""): PublicSocialLinks {
  const find = (name: string) => links.find((link) => link.toLowerCase().includes(name)) ?? "";
  return {
    instagram: find("instagram") || publicSocialLinks.instagram,
    tiktok: find("tiktok") || publicSocialLinks.tiktok,
    facebook: find("facebook") || publicSocialLinks.facebook,
    whatsapp: find("wa.me") || find("whatsapp") || whatsappUrl || publicSocialLinks.whatsapp
  };
}

