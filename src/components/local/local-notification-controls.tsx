"use client";

import { Bell, Loader2, Send, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import { notificationSoundPreferenceKey, playNotificationSound } from "@/lib/notifications/play-notification-sound";

export function LocalNotificationControls() {
  const [sound, setSound] = useState(false);
  const [busy, setBusy] = useState<"push" | "test" | null>(null);

  useEffect(() => setSound(localStorage.getItem(notificationSoundPreferenceKey) === "enabled"), []);

  async function toggleSound() {
    const next = !sound;
    localStorage.setItem(notificationSoundPreferenceKey, next ? "enabled" : "disabled");
    setSound(next);
    if (next) await playNotificationSound();
  }

  async function activatePush() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const token = localStorage.getItem("lbbs:localToken");
    if (!publicKey) return window.alert("Push no configurado.");
    if (!token) return window.alert("Inicia sesion en el dispositivo.");
    setBusy("push");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return window.alert("Habilita las notificaciones desde el navegador.");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
      const response = await fetch("/api/local/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-local-token": token },
        body: JSON.stringify(subscription.toJSON())
      });
      if (!response.ok) window.alert((await response.json()).error ?? "No se pudo activar push.");
    } finally {
      setBusy(null);
    }
  }

  async function sendTest() {
    const token = localStorage.getItem("lbbs:localToken");
    if (!token) return window.alert("Inicia sesion en el dispositivo.");
    setBusy("test");
    try {
      const response = await fetch("/api/local/notifications/test", { method: "POST", headers: { "x-local-token": token } });
      if (!response.ok) window.alert((await response.json()).error ?? "No se pudo enviar la prueba.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fixed bottom-3 left-3 z-[1200] flex flex-wrap gap-2 rounded-xl border border-[var(--control-border)] bg-[var(--control-surface)] p-2 shadow-[var(--control-shadow)]">
      <button className="inline-flex items-center gap-2 rounded-lg border border-[var(--control-border)] px-3 py-2 text-xs" onClick={toggleSound}>
        {sound ? <Volume2 size={14} /> : <VolumeX size={14} />} {sound ? "Sonido activo" : "Activar sonido"}
      </button>
      <button className="inline-flex items-center gap-2 rounded-lg border border-[var(--control-border)] px-3 py-2 text-xs" disabled={busy === "push"} onClick={activatePush}>
        {busy === "push" ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />} Activar notificaciones
      </button>
      <button className="inline-flex items-center gap-2 rounded-lg border border-[var(--control-border)] px-3 py-2 text-xs" disabled={busy === "test"} onClick={sendTest}>
        {busy === "test" ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Enviar prueba local
      </button>
    </div>
  );
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from([...window.atob(base64)].map((character) => character.charCodeAt(0)));
}
