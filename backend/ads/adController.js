import { adService } from "./adService.js";
import { createAdSchema } from "./adValidator.js";

export const adController = {
  async createAd(req, res, next) {
    try {
      const validatedData = createAdSchema.parse(req.body);
      const ad = await adService.createAd(validatedData);
      res.status(201).json({ success: true, data: ad });
    } catch (error) {
      next(error);
    }
  },

  async getActiveAds(req, res, next) {
    try {
      const { placement, date } = req.query;
      const ads = await adService.getActiveAds({ placement, date });
      res.json({ success: true, data: ads });
    } catch (error) {
      next(error);
    }
  },

  async trackImpression(req, res, next) {
    try {
      const { id } = req.params;
      const updatedAd = await adService.trackImpression(id);
      res.json({ success: true, message: "Impression tracked", data: updatedAd });
    } catch (error) {
      next(error);
    }
  },

  async trackClick(req, res, next) {
    try {
      const { id } = req.params;
      const updatedAd = await adService.trackClick(id);
      res.json({ success: true, message: "Click tracked", data: updatedAd });
    } catch (error) {
      next(error);
    }
  }
};
