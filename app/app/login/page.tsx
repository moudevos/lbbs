import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <Suspense fallback={<div className="text-sm text-[var(--text-muted)]">Cargando...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
