"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function ChangePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 8) {
      await Swal.fire("Password debil", "Usa al menos 8 caracteres.", "warning");
      return;
    }

    if (password !== confirmPassword) {
      await Swal.fire("No coincide", "La confirmacion debe ser igual al nuevo password.", "warning");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setLoading(false);
      await Swal.fire("No se pudo cambiar", error.message, "error");
      return;
    }

    const response = await fetch("/api/auth/complete-password-change", { method: "POST" });

    if (!response.ok) {
      setLoading(false);
      await Swal.fire("Cambio incompleto", "El password se actualizo, pero no se pudo cerrar el requisito interno.", "error");
      return;
    }

    await Swal.fire("Password actualizado", "Ya puedes usar el panel interno.", "success");
    router.replace("/app/control");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="glass-panel gold-border max-w-lg rounded-2xl p-6">
      <p className="text-sm uppercase tracking-[0.22em] text-[var(--gold-soft)]">Seguridad</p>
      <h1 className="mt-3 text-3xl font-semibold text-white">Cambia tu password temporal</h1>

      <label className="mt-8 block text-sm text-[var(--text-muted)]">
        Nuevo password
        <input
          className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-4 py-3 text-white outline-none focus:border-[var(--gold)]"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>

      <label className="mt-4 block text-sm text-[var(--text-muted)]">
        Confirmar password
        <input
          className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-4 py-3 text-white outline-none focus:border-[var(--gold)]"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
      </label>

      <button
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--gold)] px-5 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={loading}
      >
        <KeyRound size={18} />
        {loading ? "Actualizando..." : "Actualizar password"}
      </button>
    </form>
  );
}
