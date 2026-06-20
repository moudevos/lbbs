"use client";

import { useEffect, useRef } from "react";
import { publishOperationalNotification } from "@/lib/notifications/operational-notification-events";
import { playNotificationSound } from "@/lib/notifications/play-notification-sound";
import { subscribeToLocalDeviceBroadcast } from "@/lib/realtime/operational-realtime-client";

export function LocalNotificationBridge() {
  const received = useRef(new Set<string>());

  useEffect(() => {
    const token = localStorage.getItem("lbbs:localToken");
    if (!token) return;
    let stop: (() => void) | undefined;
    void fetch("/api/local/agenda", { headers: { "x-local-token": token } })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!data?.branchId) return;
        stop = subscribeToLocalDeviceBroadcast({
          branchId: data.branchId,
          onEvent: (notification) => {
            if (received.current.has(notification.id)) return;
            received.current.add(notification.id);
            publishOperationalNotification(notification);
            void playNotificationSound();
            window.dispatchEvent(new CustomEvent("lbbs:local-data-changed", { detail: notification }));
          }
        });
      });
    return () => stop?.();
  }, []);

  return null;
}
