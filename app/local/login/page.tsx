import { Suspense } from "react";
import { LocalLogin } from "@/components/local/local-login";

export default function LocalLoginPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center bg-black text-sm text-[var(--text-muted)]">Cargando acceso local...</div>}>
      <LocalLogin />
    </Suspense>
  );
}
