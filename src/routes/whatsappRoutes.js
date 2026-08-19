// src/routes/whatsappRoutes.js
import { Router } from "express";
import { verifyWebhook, receiveWebhook } from "../controllers/whatsappController.js";

export const whatsappRoutes = Router();

whatsappRoutes.get("/webhook", verifyWebhook);
whatsappRoutes.post("/webhook", receiveWebhook);
