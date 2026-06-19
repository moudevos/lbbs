"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function LocalLogin() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");

  useEffect(() => {
    const urlToken = searchParams.get("token");
    if (urlToken) setToken(urlToken);
  }, [searchParams]);

  function save() {
    localStorage.setItem("lbbs:localToken", token);
    window.location.href = "/local/agenda";
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--control-bg)] px-6 text-[var(--control-text)]">
      <section className="w-full max-w-lg rounded-3xl border border-[var(--control-border)] bg-[var(--control-surface)] p-6 shadow-[var(--control-shadow)]">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--control-primary)]">Modo local</p>
        <h1 className="mt-3 text-3xl font-semibold">Conectar dispositivo</h1>
        <p className="mt-2 text-sm text-[var(--control-muted)]">Ingresa o confirma el token del dispositivo para operar agenda y atenciones de la sede asignada.</p>
        <input className="control-input mt-6 py-3" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Token local" />
        <button className="control-primary-action mt-4 w-full rounded-xl px-4 py-3 font-semibold transition disabled:opacity-60" disabled={!token} onClick={save}>Entrar a agenda local</button>
      </section>
    </main>
  );
}
