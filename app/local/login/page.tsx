import { Suspense } from "react";
import { LocalLogin } from "@/components/local/local-login";

export default function LocalLoginPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center bg-[var(--control-bg)] text-sm text-[var(--control-muted)]">Cargando acceso local...</div>}>
      <LocalLogin />
    </Suspense>
  );
}
