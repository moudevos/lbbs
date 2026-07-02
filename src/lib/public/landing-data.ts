import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolvePublicImageUrl } from "@/lib/storage/resolve-public-image-url";
import { dedupeById } from "@/lib/utils/dedupe-by-id";
import { getMainContact, type PublicContact } from "@/lib/public-contact/get-main-contact";

export type LandingService = {
  id: string;
  branchId: string | null;
  name: string;
  durationMinutes: number;
  price: number | null;
  description: string | null;
  branchName: string | null;
  branchCode: string | null;
};

export type LandingTeamMember = {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string | null;
  fullName: string;
  specialty: string;
  branchName: string | null;
  profilePhotoUrl: string | null;
};

export type LandingReview = {
  id: string;
  name: string;
  comment: string;
  rating: number;
  branchName: string | null;
  createdAt: string;
};

export type LandingBranch = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
};

export type LandingSettings = {
  businessName: string;
  phones: string[];
  socialLinks: string[];
};

export type LandingGalleryItem = {
  id: string;
  title: string;
  description: string;
  serviceName: string;
  barberName: string;
  imageUrl: string;
  altText: string;
};

export type LandingData = {
  services: LandingService[];
  team: LandingTeamMember[];
  reviews: LandingReview[];
  branches: LandingBranch[];
  settings: LandingSettings;
  gallery: LandingGalleryItem[];
  mainContact: PublicContact;
};

export async function getLandingData(): Promise<LandingData> {
  const admin = createAdminClient();
  const [services, team, reviews, branches, settings, gallery, mainContact] = await Promise.all([
    getServices(admin),
    getTeam(admin),
    getReviews(admin),
    getBranches(admin),
    getSettings(admin),
    getGallery(admin),
    getMainContact(admin)
  ]);

  return {
    services,
    team,
    reviews,
    branches,
    settings,
    gallery,
    mainContact
  };
}

export async function getLandingGallery(limit = 20): Promise<LandingGalleryItem[]> {
  return getGallery(createAdminClient(), limit);
}

async function getGallery(admin: ReturnType<typeof createAdminClient>, limit = 20) {
  const { data, error } = await admin
    .from("landing_assets")
    .select("id,title,description,service_name,barber_name,image_path,image_url,path,alt_text,sort_order,created_at")
    .eq("asset_type", "work_gallery")
    .eq("is_active", true)
    .order("sort_order")
    .order("created_at", { ascending: false })
    .limit(Math.min(limit, 20));

  if (error) return [];

  const unique = dedupeById(data ?? []);
  const resolved = await Promise.all(unique.map(async (item) => {
    const title = item.title?.trim() || "Trabajo de barberia";
    const imageUrl = await resolvePublicImageUrl({
      admin,
      bucket: "landing-assets",
      path: item.image_path || item.path,
      fallback: null
    });
    if (!imageUrl) return null;
    return {
      id: item.id,
      title,
      description: item.description?.trim() || "",
      serviceName: item.service_name?.trim() || "Servicio personalizado",
      barberName: item.barber_name?.trim() || "Equipo La Bajadita",
      imageUrl,
      altText: item.alt_text?.trim() || `${title} en La Bajadita Barber Studio, barberia en Iquitos`
    };
  }));

  return resolved.filter((item): item is LandingGalleryItem => Boolean(item));
}

async function getServices(admin: ReturnType<typeof createAdminClient>) {
  const { data, error } = await admin
    .from("services")
    .select("id,name,description,duration_minutes,price,branch_id,branches!inner(name,code)")
    .eq("is_active", true)
    .eq("branches.code", "SED-002")
    .order("name");

  if (error) return [];

  return dedupeById(data ?? []).map((service) => {
    const branch = Array.isArray(service.branches) ? service.branches[0] : service.branches;
    return {
      id: service.id,
      branchId: service.branch_id,
      name: service.name,
      description: service.description,
      durationMinutes: service.duration_minutes,
      price: service.price,
      branchName: branch?.name ?? null,
      branchCode: branch?.code ?? null
    };
  });
}

async function getTeam(admin: ReturnType<typeof createAdminClient>) {
  const { data, error } = await admin
    .from("employees")
    .select("id,first_name,last_name,nickname,specialty,profile_photo_path,profile_photo_url,branch_id,role,can_perform_services,branches(name)")
    .eq("is_active", true)
    .not("branch_id", "is", null)
    .or("role.eq.barbero,can_perform_services.eq.true")
    .order("first_name");

  if (error) return [];

  return Promise.all(dedupeById(data ?? []).map(async (employee) => {
    const branch = Array.isArray(employee.branches) ? employee.branches[0] : employee.branches;
    const profilePhotoUrl = await resolvePublicImageUrl({
      admin,
      bucket: "employee-avatars",
      path: employee.profile_photo_path,
      fallback: employee.profile_photo_url
    });
    return {
      id: employee.id,
      firstName: employee.first_name?.trim() || "",
      lastName: employee.last_name?.trim() || "",
      nickname: employee.nickname?.trim() || null,
      fullName: `${employee.first_name ?? ""} ${employee.last_name ?? ""}`.trim(),
      specialty: employee.specialty?.trim() || "Barbero profesional",
      branchName: branch?.name ?? "La Bajadita Barber Studio",
      profilePhotoUrl
    };
  }));
}

async function getReviews(admin: ReturnType<typeof createAdminClient>) {
  const { data, error } = await admin
    .from("customer_reviews")
    .select("id,display_name,rating,comment,is_anonymous,created_at,branches(name)")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) return [];

  return dedupeById(data ?? []).slice(0, 10).map((review) => {
    const branch = Array.isArray(review.branches) ? review.branches[0] : review.branches;
    return {
      id: review.id,
      name: review.is_anonymous ? "Cliente La Bajadita" : review.display_name || "Cliente La Bajadita",
      rating: Number(review.rating ?? 0),
      comment: review.comment,
      branchName: branch?.name ?? null,
      createdAt: review.created_at
    };
  });
}

async function getBranches(admin: ReturnType<typeof createAdminClient>) {
  const { data, error } = await admin
    .from("branches")
    .select("id,code,name,address,phone,image_path,image_url,image_alt")
    .eq("is_active", true)
    .order("name");

  if (error) return [];
  return Promise.all((data ?? []).map(async (branch) => ({
    id: branch.id,
    code: branch.code,
    name: branch.name,
    address: branch.address ?? null,
    phone: branch.phone ?? null,
    imageUrl: await resolvePublicImageUrl({
      admin,
      bucket: "landing-assets",
      path: branch.image_path,
      fallback: branch.image_url
    }),
    imageAlt: branch.image_alt?.trim() || `Sede ${branch.name} de La Bajadita Barber Studio`
  })));
}

async function getSettings(admin: ReturnType<typeof createAdminClient>) {
  const { data } = await admin.from("app_settings").select("value").eq("key", "business_profile").maybeSingle();
  const value = (data?.value ?? {}) as Partial<LandingSettings>;
  return {
    businessName: value.businessName ?? "La Bajadita Barber Studio",
    phones: Array.isArray(value.phones) ? value.phones : [],
    socialLinks: Array.isArray(value.socialLinks) ? value.socialLinks : []
  };
}
