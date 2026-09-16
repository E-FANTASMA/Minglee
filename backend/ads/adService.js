import { supabase } from "../../src/supabase.js";
import crypto from "crypto";

const inMemoryAds = new Map();

function isTableNotFoundError(error) {
  return error && (error.code === "PGRST205" || error.code === "42P01" || (error.message && error.message.includes("schema cache")));
}

export const adService = {
  async createAd(data) {
    const payload = {
      title: data.title,
      image_url: data.image_url,
      target_url: data.target_url,
      placement: data.placement,
      impressions: data.impressions ?? 0,
      clicks: data.clicks ?? 0,
      start_date: data.start_date || new Date().toISOString(),
      end_date: data.end_date,
      is_active: data.is_active ?? true,
      created_at: new Date().toISOString()
    };

    try {
      const { data: ad, error } = await supabase
        .from("ads")
        .insert([payload])
        .select()
        .single();

      if (error) {
        if (isTableNotFoundError(error)) {
          return this._createAdFallback(payload);
        }
        throw error;
      }
      return ad;
    } catch (err) {
      if (isTableNotFoundError(err)) {
        return this._createAdFallback(payload);
      }
      throw err;
    }
  },

  _createAdFallback(payload) {
    const ad = {
      id: crypto.randomUUID(),
      ...payload
    };
    inMemoryAds.set(ad.id, ad);
    return ad;
  },

  async getActiveAds(filters = {}) {
    const targetDate = filters.date ? new Date(filters.date).toISOString() : new Date().toISOString();

    try {
      let query = supabase
        .from("ads")
        .select("*")
        .eq("is_active", true)
        .lte("start_date", targetDate)
        .gte("end_date", targetDate);

      if (filters.placement) {
        query = query.eq("placement", filters.placement);
      }

      query = query.order("created_at", { ascending: false });

      const { data: ads, error } = await query;

      if (error) {
        if (isTableNotFoundError(error)) {
          return this._getActiveAdsFallback(filters, targetDate);
        }
        throw error;
      }
      return ads;
    } catch (err) {
      if (isTableNotFoundError(err)) {
        return this._getActiveAdsFallback(filters, targetDate);
      }
      throw err;
    }
  },

  _getActiveAdsFallback(filters, targetDate) {
    const t = new Date(targetDate).getTime();
    return Array.from(inMemoryAds.values()).filter(ad => {
      if (!ad.is_active) return false;
      if (filters.placement && ad.placement !== filters.placement) return false;
      const start = new Date(ad.start_date).getTime();
      const end = new Date(ad.end_date).getTime();
      return start <= t && t <= end;
    });
  },

  async trackImpression(id) {
    try {
      const { data: ad, error: fetchErr } = await supabase
        .from("ads")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchErr) {
        if (isTableNotFoundError(fetchErr)) {
          return this._trackImpressionFallback(id);
        }
        throw fetchErr;
      }

      const newImpressions = (ad.impressions || 0) + 1;

      const { data: updatedAd, error: updateErr } = await supabase
        .from("ads")
        .update({ impressions: newImpressions })
        .eq("id", id)
        .select()
        .single();

      if (updateErr) throw updateErr;
      return updatedAd;
    } catch (err) {
      if (isTableNotFoundError(err)) {
        return this._trackImpressionFallback(id);
      }
      throw err;
    }
  },

  _trackImpressionFallback(id) {
    const ad = inMemoryAds.get(id);
    if (!ad) {
      throw new Error("Ad not found");
    }
    ad.impressions = (ad.impressions || 0) + 1;
    inMemoryAds.set(id, ad);
    return ad;
  },

  async trackClick(id) {
    try {
      const { data: ad, error: fetchErr } = await supabase
        .from("ads")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchErr) {
        if (isTableNotFoundError(fetchErr)) {
          return this._trackClickFallback(id);
        }
        throw fetchErr;
      }

      const newClicks = (ad.clicks || 0) + 1;

      const { data: updatedAd, error: updateErr } = await supabase
        .from("ads")
        .update({ clicks: newClicks })
        .eq("id", id)
        .select()
        .single();

      if (updateErr) throw updateErr;
      return updatedAd;
    } catch (err) {
      if (isTableNotFoundError(err)) {
        return this._trackClickFallback(id);
      }
      throw err;
    }
  },

  _trackClickFallback(id) {
    const ad = inMemoryAds.get(id);
    if (!ad) {
      throw new Error("Ad not found");
    }
    ad.clicks = (ad.clicks || 0) + 1;
    inMemoryAds.set(id, ad);
    return ad;
  }
};
