import { MailCheck } from "lucide-react";

export default function VerifyEmailPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="glass-panel gold-border max-w-xl rounded-2xl p-7 text-center">
        <MailCheck className="mx-auto text-[var(--gold)]" size={42} />
        <p className="mt-5 text-sm uppercase tracking-[0.22em] text-[var(--gold-soft)]">Verificacion requerida</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Revisa tu correo</h1>
        <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
          Activa tu acceso desde el enlace enviado por Supabase. Luego ingresa con tu contraseña temporal y el sistema te pedira cambiarla.
        </p>
        <a className="mt-6 inline-flex rounded-lg bg-[var(--gold)] px-5 py-3 font-semibold text-black" href="/app/login">
          Volver al login
        </a>
      </section>
    </main>
  );
}
