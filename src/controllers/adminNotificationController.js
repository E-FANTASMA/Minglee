import { z } from "zod";
import { supabase } from "../supabase.js";
import { ApiError } from "../utils/apiError.js";
import { pushNotificationService } from "../services/pushNotificationService.js";

const sendNotificationSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(2000),
  url: z.string().trim().max(2048).optional(),
  targetAudience: z.enum(["all", "single"]).default("all"),
  targetUserId: z.string().uuid().optional()
}).refine(
  (data) => data.targetAudience !== "single" || Boolean(data.targetUserId),
  { message: "targetUserId is required for a single-user notification" }
);

export const adminNotificationController = {
  async send(req, res) {
    const input = sendNotificationSchema.parse(req.body);
    let userIdsQuery = supabase.from("users").select("id");

    if (input.targetAudience === "single") {
      userIdsQuery = userIdsQuery.eq("id", input.targetUserId);
    }

    const { data: users, error } = await userIdsQuery;
    if (error) throw error;
    if (!users?.length) {
      throw new ApiError(404, "No notification recipients found");
    }

    const rows = users.map((user) => ({
      user_id: user.id,
      title: input.title,
      message: input.body,
      type: "notification",
      category: "admin",
      is_read: false,
      is_dismissed: false,
      metadata: {},
      action_url: input.url || null
    }));
    const { data: notifications, error: insertError } = await supabase
      .from("notifications")
      .insert(rows)
      .select("id, user_id");

    if (insertError) throw insertError;

    let pushDelivery;
    try {
      pushDelivery = await pushNotificationService.sendToUsers(
        users.map((user) => user.id),
        {
          id: notifications[0]?.id,
          title: input.title,
          body: input.body,
          url: input.url
        }
      );
    } catch (error) {
      console.error("Could not complete web push delivery:", error);
      pushDelivery = {
        configured: true,
        subscriptions: 0,
        delivered: 0,
        failed: users.length,
        reason: "Push delivery could not be completed"
      };
    }

    const message = !pushDelivery.configured
      ? `In-app notification added for ${notifications.length} user${notifications.length === 1 ? "" : "s"}. ${pushDelivery.reason || "Web push credentials are not configured."}.`
      : pushDelivery.subscriptions === 0
        ? `In-app notification added for ${notifications.length} user${notifications.length === 1 ? "" : "s"}. ${pushDelivery.reason || "No users have registered a push subscription yet"}.`
        : `In-app notification added for ${notifications.length} user${notifications.length === 1 ? "" : "s"}; push delivered to ${pushDelivery.delivered} of ${pushDelivery.subscriptions} subscribed device${pushDelivery.subscriptions === 1 ? "" : "s"}.`;

    res.status(pushDelivery.failed > 0 && pushDelivery.delivered === 0 && pushDelivery.subscriptions > 0 ? 207 : 201).json({
      success: true,
      count: notifications.length,
      pushDelivery,
      message
    });
  }
};
