import { Router } from "express";
import { authRoutes } from "./authRoutes.js";
import { eventRoutes } from "./eventRoutes.js";
import { onboardingRoutes } from "./onboardingRoutes.js";
import { whatsappRoutes } from "./whatsappRoutes.js";

export const routes = Router();

routes.get("/health", (_req, res) => res.json({ ok: true }));

routes.use("/auth", authRoutes);
routes.use("/events", eventRoutes);
routes.use("/whatsapp", whatsappRoutes);
routes.use("/", onboardingRoutes);
