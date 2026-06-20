"use client";

import type { RealtimeNotification } from "@/lib/realtime/realtime-events";

export const operationalNotificationEvent = "lbbs:operational-realtime";
export const operationalNotificationDismissEvent = "lbbs:operational-notification-dismiss";
export const operationalNotificationClearEvent = "lbbs:operational-notification-clear";

export function publishOperationalNotification(notification: RealtimeNotification) {
  window.dispatchEvent(new CustomEvent(operationalNotificationEvent, { detail: notification }));
}

export function dismissOperationalNotification(id: string) {
  window.dispatchEvent(new CustomEvent(operationalNotificationDismissEvent, { detail: { id } }));
}

export function clearOperationalNotifications() {
  window.dispatchEvent(new Event(operationalNotificationClearEvent));
}
