import { notificationService } from "./notificationService.js";
import {
  createNotificationSchema,
  triggerBroadcastSchema,
  createPopupSchema
} from "./notificationValidator.js";

export const notificationController = {
  async createNotification(req, res, next) {
    try {
      const payload = {
        ...req.body,
        user_id: req.body.user_id || req.user?.id
      };
      const validated = createNotificationSchema.parse(payload);
      const result = await notificationService.createNotification(validated);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async triggerBroadcast(req, res, next) {
    try {
      const validated = triggerBroadcastSchema.parse(req.body);
      const results = await notificationService.triggerBroadcast(validated);
      res.status(201).json({ success: true, count: results.length, data: results });
    } catch (error) {
      next(error);
    }
  },

  async getUserNotifications(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized: Missing user authentication token" });
      }

      const limit = parseInt(req.query.limit || "50", 10);
      const offset = parseInt(req.query.offset || "0", 10);

      const data = await notificationService.getUserNotifications(userId, limit, offset);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async getUnreadNotifications(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized: Missing user authentication token" });
      }

      const data = await notificationService.getUnreadNotifications(userId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async getPopups(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized: Missing user authentication token" });
      }

      const data = await notificationService.getPopups(userId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  async markAsRead(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized: Missing user authentication token" });
      }

      const data = await notificationService.markAsRead(id, userId);
      res.json({ success: true, message: "Notification marked as read", data });
    } catch (error) {
      next(error);
    }
  },

  async markAsDismissed(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized: Missing user authentication token" });
      }

      const data = await notificationService.markAsDismissed(id, userId);
      res.json({ success: true, message: "Notification / Popup dismissed", data });
    } catch (error) {
      next(error);
    }
  },

  async markAllAsRead(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized: Missing user authentication token" });
      }

      const data = await notificationService.markAllAsRead(userId);
      res.json({ success: true, message: "All notifications marked as read", count: data.length, data });
    } catch (error) {
      next(error);
    }
  },

  async deleteNotification(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized: Missing user authentication token" });
      }

      const data = await notificationService.deleteNotification(id, userId);
      res.json({ success: true, message: "Notification deleted", data });
    } catch (error) {
      next(error);
    }
  },

  // Popups
  async createPopup(req, res, next) {
    try {
      const validated = createPopupSchema.parse(req.body);
      const popup = await notificationService.createNotification({
        ...validated,
        type: "popup"
      });
      res.status(201).json({ success: true, data: popup });
    } catch (error) {
      next(error);
    }
  }
};
