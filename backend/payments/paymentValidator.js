import { z } from "zod";

export const initializePaymentSchema = z.object({
  user_id: z.string().uuid("Valid user_id UUID is required"),
  event_id: z.string().uuid("Valid event_id UUID is required"),
  email: z.string().email("Valid user email is required"),
  amount: z.number().positive("Amount must be greater than 0"),
  currency: z.string().default("NGN"),
  gateway: z.enum(["paystack", "flutterwave"]).default("paystack"),
  callback_url: z.string().url().optional()
});

export const verifyPaymentSchema = z.object({
  reference: z.string().min(1, "Payment reference is required")
});
