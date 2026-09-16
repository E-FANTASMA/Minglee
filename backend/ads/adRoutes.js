import { Router } from "express";
import { adController } from "./adController.js";

export const adRoutes = Router();

// Endpoint definitions per specification:
// POST /ads → create ad
// GET /ads → fetch active ads (filter by placement + date)
// POST /ads/:id/click → increment click count
// POST /ads/:id/impression → increment impression count

adRoutes.post("/", adController.createAd);
adRoutes.get("/", adController.getActiveAds);
adRoutes.post("/:id/impression", adController.trackImpression);
adRoutes.post("/:id/click", adController.trackClick);
