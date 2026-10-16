import { z } from "zod";

export const adTypeEnum = z.enum(["banner", "notification", "popup", "ticket_boost"]);

export const createAdSchema = z
  .object({
    title: z.string().min(1, "Title is required").optional().default("Promotion"),
    text_content: z.string().optional().default(""),
    image_url: z.string().url("Valid image_url is required").optional().nullable(),
    target_url: z.string().optional().default(""),
    ad_type: adTypeEnum.optional().default("banner"),
    placement: z.string().optional().default("home-banner"),
    scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD").optional(),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    popup_id: z.string().uuid().optional().nullable(),
    event_id: z.string().uuid().optional().nullable(),
    is_active: z.boolean().optional().default(true),
    impressions: z.number().int().optional().default(0),
    clicks: z.number().int().optional().default(0),
    status: z.enum(["pending", "approved", "rejected", "expired"]).optional().default("pending"),
  })
  .superRefine((data, ctx) => {
    // Notification ads must have text description and link to a popup in the app
    if (data.ad_type === "notification") {
      if (!data.text_content && !data.title) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Notification ads require a text description",
          path: ["text_content"],
        });
      }
    }

    // Banner ads require media and target link
    if (data.ad_type === "banner" || data.ad_type === "ticket_boost") {
      if (!data.image_url) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Media image is required for banner ads",
          path: ["image_url"],
        });
      }
    }

    // Popup ads require media, text and link
    if (data.ad_type === "popup") {
      if (!data.image_url) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Media image is required for popup ads",
          path: ["image_url"],
        });
      }
    }

    // Date duration check: at least 24 hours for notification and popup ads
    if (data.ad_type === "notification" || data.ad_type === "popup") {
      const start = new Date(data.start_time || data.start_date || Date.now()).getTime();
      const end = new Date(data.end_time || data.end_date || start + 86400000).getTime();
      const min24Hours = 24 * 60 * 60 * 1000 - 60000; // allow 1 minute tolerance
      if (end - start < min24Hours) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Notification and popup ads must be shown for at least 24 hours",
          path: ["end_time"],
        });
      }
    }
  });

export const reviewAdSchema = z.object({
  action: z.enum(["approve", "reject"]),
  rejection_reason: z.string().optional(),
});
