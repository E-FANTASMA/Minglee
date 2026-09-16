import { z } from "zod";

export const createAdSchema = z.object({
  title: z.string().min(1, "Title is required"),
  image_url: z.string().url("Valid image_url is required"),
  target_url: z.string().url("Valid target_url is required"),
  placement: z.string().min(1, "Placement is required"),
  start_date: z.string().optional(),
  end_date: z.string().min(1, "End date is required"),
  is_active: z.boolean().optional().default(true),
  impressions: z.number().int().optional().default(0),
  clicks: z.number().int().optional().default(0)
});
