import { z } from "zod";

export const createNotificationSchema = z.object({
  user_id: z.string().min(1, "user_id is required"),
  message: z.string().min(1, "message is required"),
  title: z.string().optional().default("Notification"),
  type: z.enum(["notification", "popup"]).optional().default("notification"),
  category: z.string().optional().default("info"),
  is_dismissed: z.boolean().optional().default(false),
  expires_at: z.string().datetime({ offset: true }).optional().or(z.string()).nullable(),
  metadata: z.record(z.any()).optional().default({}),
  action_url: z.string().optional()
});

export const triggerBroadcastSchema = z.object({
  user_ids: z.array(z.string().min(1)).min(1, "At least one target user_id is required"),
  message: z.string().min(1, "message is required"),
  title: z.string().optional().default("Notification"),
  type: z.enum(["notification", "popup"]).optional().default("notification"),
  category: z.string().optional().default("info"),
  expires_at: z.string().datetime({ offset: true }).optional().or(z.string()).nullable(),
  metadata: z.record(z.any()).optional().default({}),
  action_url: z.string().optional()
});

export const createPopupSchema = z.object({
  user_id: z.string().optional().default("all"),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "message is required"),
  category: z.string().optional().default("promo"),
  expires_at: z.string().datetime({ offset: true }).optional().or(z.string()).nullable(),
  metadata: z.record(z.any()).optional().default({}),
  action_url: z.string().optional()
});

export const pushSubscriptionSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url().refine((value) => value.startsWith("https://"), {
      message: "Push subscription endpoint must use HTTPS"
    }),
    expirationTime: z.number().nullable().optional(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1)
    })
  })
});
