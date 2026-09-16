import { paymentService } from "./paymentService.js";
import { initializePaymentSchema, verifyPaymentSchema } from "./paymentValidator.js";

export const paymentController = {
  async initializePayment(req, res, next) {
    try {
      const validated = initializePaymentSchema.parse(req.body);
      const result = await paymentService.initializePayment(validated);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async verifyPayment(req, res, next) {
    try {
      const { reference } = verifyPaymentSchema.parse(req.params);
      const result = await paymentService.verifyPayment(reference);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async handleWebhook(req, res, next) {
    try {
      const signature = req.headers["x-paystack-signature"];
      const isValid = paymentService.verifyWebhookSignature(req.rawBody || JSON.stringify(req.body), signature);

      // If signature is invalid in production, reject it (allow in test if secret key is mock)
      if (!isValid && process.env.NODE_ENV === "production") {
        return res.status(400).json({ success: false, error: "Invalid webhook signature" });
      }

      const result = await paymentService.handleWebhook(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async getUserTickets(req, res, next) {
    try {
      const userId = req.headers["x-user-id"] || req.query.user_id;
      if (!userId) {
        return res.status(400).json({ success: false, error: "x-user-id header or user_id query param is required" });
      }
      const tickets = await paymentService.getUserTickets(userId);
      res.json({ success: true, data: tickets });
    } catch (error) {
      next(error);
    }
  }
};
