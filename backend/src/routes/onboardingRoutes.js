import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authMiddleware } from "../middleware/auth.js";
import * as onboardingController from "../controllers/onboardingController.js";
import { uploadAnyImage } from "../middleware/upload.js";
import * as uploadController from "../controllers/uploadController.js";

export const onboardingRoutes = Router();

// All onboarding/profile endpoints require authentication.
onboardingRoutes.use(authMiddleware);

onboardingRoutes.post("/profile", asyncHandler(onboardingController.upsertProfile));
onboardingRoutes.post("/preferences", asyncHandler(onboardingController.upsertPreferences));
onboardingRoutes.post("/focuses", asyncHandler(onboardingController.saveFocuses));
onboardingRoutes.post("/preferred-builds", asyncHandler(onboardingController.savePreferredBuilds));
onboardingRoutes.post("/photos/upload", uploadAnyImage, asyncHandler(uploadController.uploadUserPhoto));
onboardingRoutes.post("/photos", asyncHandler(onboardingController.savePhotos));
onboardingRoutes.get("/me/profile", asyncHandler(onboardingController.getMeProfile));
