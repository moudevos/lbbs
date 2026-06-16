import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "NEXT_PUBLIC_APP_URL"
];

function loadLocalEnv() {
  const raw = readFileSync(".env.local", "utf8");
  const env = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index);
    const value = trimmed.slice(index + 1);
    env[key] = value;
  }

  return env;
}

function assertEnv(env) {
  for (const key of REQUIRED_ENV) {
    if (!env[key]) {
      throw new Error(`Missing ${key}`);
    }
    if (/TU_|PROJECT_REF|POOLER_HOST|PASSWORD/.test(env[key])) {
      throw new Error(`${key} still contains a placeholder`);
    }
  }
}

async function assertQuery(label, queryPromise) {
  const { data, error } = await queryPromise;
  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }
  return data;
}

const env = loadLocalEnv();
assertEnv(env);

const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

await assertQuery("public branches read", anon.from("branches").select("id").limit(1));
const branches = await assertQuery("admin branches read", admin.from("branches").select("id,is_active").limit(10));
await assertQuery("admin services read", admin.from("services").select("id").limit(1));
await assertQuery("admin whatsapp templates read", admin.from("whatsapp_templates").select("id").limit(1));
const admins = await assertQuery(
  "active admin employee read",
  admin
    .from("employees")
    .select("id,branch_id,must_change_password,is_active,role")
    .eq("role", "admin")
    .eq("is_active", true)
    .limit(5)
);

const activeBranchIds = new Set((branches ?? []).filter((branch) => branch.is_active).map((branch) => branch.id));
const validAdmin = (admins ?? []).find(
  (employee) =>
    employee.must_change_password === false &&
    employee.branch_id &&
    activeBranchIds.has(employee.branch_id)
);

if (!validAdmin) {
  throw new Error("No active admin employee found with a valid branch and must_change_password=false");
}

console.log("Supabase smoke test passed");
