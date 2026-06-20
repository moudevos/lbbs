import webPush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

type PushPayload = {
  title: string;
  body: string;
  url?: string | null;
  notificationId: string;
  type: string;
  branchId: string;
};

export async function sendWebPushToBranch(admin: SupabaseClient, branchId: string, payload: PushPayload) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return { configured: false, sent: 0 };

  webPush.setVapidDetails(subject, publicKey, privateKey);
  const { data } = await admin.from("push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("branch_id", branchId)
    .eq("active", true);

  let sent = 0;
  await Promise.all((data ?? []).map(async (subscription) => {
    try {
      await webPush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth }
      }, JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: "/icons/icon-192.png",
        badge: "/icons/badge-72.png",
        data: {
          url: payload.url ?? "/app/control",
          notificationId: payload.notificationId,
          type: payload.type,
          branchId: payload.branchId
        }
      }));
      sent += 1;
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await admin.from("push_subscriptions").update({ active: false }).eq("id", subscription.id);
      }
    }
  }));
  return { configured: true, sent };
}
