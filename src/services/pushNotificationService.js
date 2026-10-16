import webPush from "web-push";
import { supabase } from "../supabase.js";
import { ApiError } from "../utils/apiError.js";

const USER_ID_BATCH_SIZE = 100;

function getVapidConfiguration() {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
    return null;
  }

  return {
    publicKey: VAPID_PUBLIC_KEY,
    privateKey: VAPID_PRIVATE_KEY,
    subject: VAPID_SUBJECT
  };
}

export const pushNotificationService = {
  async sendToUsers(userIds, notification) {
    const vapid = getVapidConfiguration();
    if (!vapid) {
      return {
        configured: false,
        subscriptions: 0,
        delivered: 0,
        failed: 0
      };
    }

    webPush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

    const subscriptions = [];
    for (let i = 0; i < userIds.length; i += USER_ID_BATCH_SIZE) {
      const userIdBatch = userIds.slice(i, i + USER_ID_BATCH_SIZE);
      const { data, error } = await supabase
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .in("user_id", userIdBatch);

      if (error) {
        if (
          error.code === "PGRST205" ||
          error.code === "42P01" ||
          error.message?.includes("push_subscriptions")
        ) {
          return {
            configured: false,
            subscriptions: 0,
            delivered: 0,
            failed: 0,
            reason: "Push subscription storage is not configured"
          };
        }
        throw error;
      }
      subscriptions.push(...(data || []));
    }

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      url: notification.url || "/home",
      tag: `minglee-${notification.id}`
    });

    const outcomes = await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await webPush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth
              }
            },
            payload
          );
          return { delivered: true };
        } catch (error) {
          const statusCode = Number(error.statusCode);
          if (statusCode === 404 || statusCode === 410) {
            const { error: deleteError } = await supabase
              .from("push_subscriptions")
              .delete()
              .eq("id", subscription.id);
            if (deleteError) throw deleteError;
          } else {
            console.error("Web push delivery failed:", {
              statusCode: Number.isFinite(statusCode) ? statusCode : undefined,
              message: error.message
            });
          }
          return { delivered: false };
        }
      })
    );

    const delivered = outcomes.filter((result) => result.delivered).length;
    return {
      configured: true,
      subscriptions: subscriptions.length,
      delivered,
      failed: subscriptions.length - delivered
    };
  }
};
