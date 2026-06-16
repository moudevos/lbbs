"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Swal from "sweetalert2";
import { LogIn, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email || !password) {
      await Swal.fire("Datos incompletos", "Ingresa email y password.", "warning");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      const message = friendlyLoginError(error.message);
      await Swal.fire(message.title, message.text, message.icon);
      return;
    }

    await fetch("/api/auth/audit-login", { method: "POST" });

    const next = searchParams.get("next") ?? "/app/control";
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="glass-panel gold-border w-full max-w-md rounded-2xl p-6">
      <div>
        <p className="text-sm uppercase tracking-[0.22em] text-[var(--gold-soft)]">Acceso interno</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">La Bajadita Barber Shop</h1>
      </div>

      <label className="mt-8 block text-sm text-[var(--text-muted)]">
        Email
        <input
          className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-4 py-3 text-white outline-none focus:border-[var(--gold)]"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>

      <label className="mt-4 block text-sm text-[var(--text-muted)]">
        Password
        <input
          className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-4 py-3 text-white outline-none focus:border-[var(--gold)]"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>

      <button
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--gold)] px-5 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={loading}
      >
        <LogIn size={18} />
        {loading ? "Ingresando..." : "Ingresar"}
      </button>
      {searchParams.get("verified") ? (
        <p className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[var(--border-soft)] bg-black/35 px-3 py-2 text-sm text-[var(--gold-soft)]">
          <MailCheck size={16} />
          Correo verificado. Ingresa con tu contraseña temporal.
        </p>
      ) : null}
    </form>
  );
}

function friendlyLoginError(message: string): { title: string; text: string; icon: "error" | "warning" } {
  const lower = message.toLowerCase();
  if (lower.includes("email not confirmed") || lower.includes("not confirmed")) {
    return { title: "Correo no confirmado", text: "Valida tu correo antes de ingresar con la contraseña temporal.", icon: "warning" };
  }
  if (lower.includes("invalid login credentials")) {
    return { title: "Credenciales incorrectas", text: "Revisa el correo y la contraseña temporal o actual.", icon: "error" };
  }
  return { title: "No se pudo ingresar", text: message, icon: "error" };
}
