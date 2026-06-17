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
    <main className="grid min-h-screen place-items-center bg-black px-6">
      <section className="w-full max-w-lg rounded-3xl border border-[var(--border-soft)] bg-black/50 p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">Modo local</p>
        <h1 className="mt-3 text-3xl font-semibold">Conectar dispositivo</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">Ingresa o confirma el token del dispositivo para operar agenda y atenciones de la sede asignada.</p>
        <input className="mt-6 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-3 text-white" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Token local" />
        <button className="mt-4 w-full rounded-lg bg-[var(--gold)] px-4 py-3 font-semibold text-black disabled:opacity-60" disabled={!token} onClick={save}>Entrar a agenda local</button>
      </section>
    </main>
  );
}
