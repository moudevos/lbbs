import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolvePublicImageUrl } from "@/lib/storage/resolve-public-image-url";
import { dedupeById } from "@/lib/utils/dedupe-by-id";

export type LandingService = {
  id: string;
  name: string;
  durationMinutes: number;
  price: number | null;
  description: string | null;
  branchName: string | null;
};

export type LandingTeamMember = {
  id: string;
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
};

export type LandingBranch = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
};

export type LandingSettings = {
  businessName: string;
  phones: string[];
  socialLinks: string[];
};

export type LandingData = {
  services: LandingService[];
  team: LandingTeamMember[];
  reviews: LandingReview[];
  branches: LandingBranch[];
  settings: LandingSettings;
};

const fallbackServices: LandingService[] = [
  { id: "fallback-classic-cut", name: "Corte clasico", durationMinutes: 30, price: null, description: "Corte clasico en Iquitos con acabado limpio y atencion personalizada.", branchName: "La Bajadita" },
  { id: "fallback-fade", name: "Corte fade", durationMinutes: 45, price: null, description: "Fade profesional para quienes buscan precision, estilo y presencia.", branchName: "La Bajadita" },
  { id: "fallback-beard", name: "Barba y perfilado", durationMinutes: 30, price: null, description: "Perfilado de barba y contornos con detalle profesional.", branchName: "La Bajadita" }
];

export async function getLandingData(): Promise<LandingData> {
  const admin = createAdminClient();
  const [services, team, reviews, branches, settings] = await Promise.all([
    getServices(admin),
    getTeam(admin),
    getReviews(admin),
    getBranches(admin),
    getSettings(admin)
  ]);

  return {
    services: services.length ? services : fallbackServices,
    team,
    reviews,
    branches,
    settings
  };
}

async function getServices(admin: ReturnType<typeof createAdminClient>) {
  const { data, error } = await admin
    .from("services")
    .select("id,name,description,duration_minutes,price,branch_id,branches(name)")
    .eq("is_active", true)
    .order("name");

  if (error) return fallbackServices;

  return dedupeById(data ?? []).map((service) => {
    const branch = Array.isArray(service.branches) ? service.branches[0] : service.branches;
    return {
      id: service.id,
      name: service.name,
      description: service.description,
      durationMinutes: service.duration_minutes,
      price: service.price,
      branchName: branch?.name ?? null
    };
  });
}

async function getTeam(admin: ReturnType<typeof createAdminClient>) {
  const { data, error } = await admin
    .from("employees")
    .select("id,first_name,last_name,nickname,specialty,profile_photo_path,profile_photo_url,branch_id,branches(name)")
    .eq("is_active", true)
    .eq("role", "barbero")
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
      nickname: employee.nickname || null,
      fullName: `${employee.first_name ?? ""} ${employee.last_name ?? ""}`.trim(),
      specialty: employee.specialty || "Barbero profesional en Iquitos",
      branchName: branch?.name ?? null,
      profilePhotoUrl
    };
  }));
}

async function getReviews(admin: ReturnType<typeof createAdminClient>) {
  const { data, error } = await admin
    .from("customer_reviews")
    .select("id,display_name,rating,comment,is_anonymous,branches(name)")
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
      branchName: branch?.name ?? null
    };
  });
}

async function getBranches(admin: ReturnType<typeof createAdminClient>) {
  const { data, error } = await admin
    .from("branches")
    .select("id,name,address,phone")
    .eq("is_active", true)
    .order("name");

  if (error) return [];
  return (data ?? []).map((branch) => ({
    id: branch.id,
    name: branch.name,
    address: branch.address ?? null,
    phone: branch.phone ?? null
  }));
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
