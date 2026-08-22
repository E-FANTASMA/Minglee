import { z } from "zod";

export const createEventSchema = z
  .object({
    event_name: z.string().trim().min(1).max(160),
    event_picture: z.string().trim().url(),
    event_day: z.string().trim().date(),
  })
  .strict();

export const registerForEventSchema = z
  .object({
    event_id: z.string().trim().uuid(),
  })
  .strict();
