import { Router } from "express";
import { notificationController } from "./notificationController.js";
import { authMiddleware } from "../../src/middleware/auth.js";

export const notificationRoutes = Router();

// Apply JWT authentication middleware to all notification routes
notificationRoutes.use(authMiddleware);

// Notifications Endpoints
notificationRoutes.post("/subscribe", notificationController.subscribe);
notificationRoutes.get("/popups", notificationController.getPopups);
notificationRoutes.get("/popups/active", notificationController.getPopups);
notificationRoutes.get("/unread", notificationController.getUnreadNotifications);
notificationRoutes.get("/", notificationController.getUserNotifications);

notificationRoutes.post("/popups", notificationController.createPopup);
notificationRoutes.post("/", notificationController.createNotification);
notificationRoutes.post("/trigger", notificationController.triggerBroadcast);

notificationRoutes.patch("/read-all", notificationController.markAllAsRead);
notificationRoutes.patch("/:id/read", notificationController.markAsRead);
notificationRoutes.patch("/:id/dismiss", notificationController.markAsDismissed);

notificationRoutes.delete("/:id", notificationController.deleteNotification);
