import { Router } from "express";
import { paymentController } from "./paymentController.js";

export const paymentRoutes = Router();

paymentRoutes.post("/initialize", paymentController.initializePayment);
paymentRoutes.get("/verify/:reference", paymentController.verifyPayment);
paymentRoutes.post("/webhook", paymentController.handleWebhook);
paymentRoutes.get("/tickets", paymentController.getUserTickets);
