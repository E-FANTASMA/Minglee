import { z } from "zod";

export const createEventSchema = z
  .object({
    event_name: z.string().trim().min(1).max(160),
    event_description: z.string().trim().min(1).max(5000).optional().default(""),
    event_picture: z.string().trim().url(),
    event_day: z.string().trim().date(),
    ticket_type: z.string().trim().min(1).max(100).optional().default("Regular"),
    ticket_price: z.number().min(0).optional().default(0),
    location: z.string().trim().min(1).max(255).optional().default("Campus"),
  })
  .strict();

export const registerForEventSchema = z
  .object({
    event_id: z.string().trim().uuid(),
  })
  .strict();

