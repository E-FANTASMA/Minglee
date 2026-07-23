import {
  focusesSchema,
  photosSchema,
  preferredBuildsSchema,
  preferencesSchema,
  profileSchema
} from "../validators/onboardingSchemas.js";
import * as profileService from "../services/profileService.js";
import { ApiError } from "../utils/apiError.js";
import { supabase } from "../supabase.js";
import path from "path";

function pickDefined(source, keys) {
  return Object.fromEntries(
    keys
      .filter((key) => source[key] !== undefined)
      .map((key) => [key, source[key]])
  );
}

function formatProfileResponse(profile) {
  if (!profile) return null;

  return {
    gender: profile.gender ?? null,
    age: profile.age ?? null,
    height: profile.height ?? null,
    build: profile.build ?? null,
    skin_tone: profile.skin_tone ?? null,
    personal_style: profile.personal_style ?? null,
    social_persona: profile.social_persona ?? null,
    weekend_type: profile.weekend_type ?? null,
    afternoon_activity: profile.afternoon_activity ?? null,
    habits: profile.habits ?? null,
    conflict_style: profile.conflict_style ?? null,
    relationship_goal: profile.relationship_goal ?? null,
    green_flag: profile.green_flag ?? null,
    instagram: profile.instagram ?? null,
    tiktok: profile.tiktok ?? null
  };
}

export async function upsertProfile(req, res) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");

  const input = profileSchema.parse(req.body);
  const profile = await profileService.upsertProfile(userId, input);
  return res.status(201).json({
    profile: formatProfileResponse(profile)
  });
}

export async function upsertPreferences(req, res) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");

  const input = preferencesSchema.parse(req.body);
  const preferences = await profileService.upsertPreferences(userId, input);
  return res.status(201).json({
    preferences: {
      preferred_min_age: preferences.preferred_min_age ?? null,
      preferred_max_age: preferences.preferred_max_age ?? null,
      preferred_min_height: preferences.preferred_min_height ?? null,
      preferred_max_height: preferences.preferred_max_height ?? null
    }
  });
}

export async function saveFocuses(req, res) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");

  const input = focusesSchema.parse(req.body);
  const focuses = await profileService.replaceFocuses(userId, input.focuses);
  return res.status(201).json({ focuses: focuses.map((f) => f.focus_option) });
}

export async function savePreferredBuilds(req, res) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");

  const input = preferredBuildsSchema.parse(req.body);
  const builds = await profileService.replacePreferredBuilds(userId, input.builds);
  return res.status(201).json({ preferred_builds: builds.map((b) => b.preferred_build) });
}

export async function savePhotos(req, res) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");

  const input = photosSchema.parse(req.body);

  // Ensure upload_order is unique (1..3)
  const uploadOrders = input.photos.map((p) => p.upload_order);
  const unique = new Set(uploadOrders);
  if (unique.size !== uploadOrders.length) {
    throw new ApiError(400, "Invalid input", { upload_order: "upload_order must be unique per photo" });
  }

  const photos = await profileService.replacePhotos(userId, input.photos);
  return res.status(201).json({
    photos: photos.map((p) => ({
      image_url: p.image_url,
      photo_type: p.photo_type,
      upload_order: p.upload_order
    }))
  });
}

export async function completeOnboarding(req, res) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");

  const body = req.body && typeof req.body === "object" ? req.body : {};

  const profileInput = pickDefined(body, [
    "gender",
    "age",
    "height",
    "build",
    "skin_tone",
    "personal_style",
    "social_persona",
    "weekend_type",
    "afternoon_activity",
    "habits",
    "conflict_style",
    "relationship_goal",
    "green_flag",
    "instagram",
    "tiktok"
  ]);

  const preferencesInput = pickDefined(body, [
    "preferred_min_age",
    "preferred_max_age",
    "preferred_min_height",
    "preferred_max_height"
  ]);

  if (Object.keys(profileInput).length > 0) {
    const parsedProfile = profileSchema.parse(profileInput);
    await profileService.upsertProfile(userId, parsedProfile);
  }

  if (Object.keys(preferencesInput).length > 0) {
    const parsedPreferences = preferencesSchema.parse(preferencesInput);
    await profileService.upsertPreferences(userId, parsedPreferences);
  }

  if (body.focuses !== undefined) {
    const parsedFocuses = focusesSchema.parse({ focuses: body.focuses });
    await profileService.replaceFocuses(userId, parsedFocuses.focuses);
  }

  if (body.preferred_builds !== undefined) {
    const parsedBuilds = preferredBuildsSchema.parse({ builds: body.preferred_builds });
    await profileService.replacePreferredBuilds(userId, parsedBuilds.builds);
  }

  const photoCandidates = Array.isArray(body.uploaded_photos)
    ? body.uploaded_photos
    : Array.isArray(body.photos)
      ? body.photos
      : null;

  if (photoCandidates) {
    const normalizedPhotos = photoCandidates.map((photo, index) => ({
      image_url: photo.image_url,
      photo_type: photo.photo_type ?? (index === 0 ? "Profile" : "Gallery"),
      upload_order: photo.upload_order ?? index + 1
    }));

    const parsedPhotos = photosSchema.parse({ photos: normalizedPhotos });
    await profileService.replacePhotos(userId, parsedPhotos.photos);
  } else {
    await profileService.markOnboardingComplete(userId);
  }

  return res.status(201).json({
    success: true,
    message: "Onboarding completed"
  });
}

export async function getMeProfile(req, res) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");

  const data = await profileService.getMeProfile(userId);
  if (!data) throw new ApiError(404, "User not found");

  return res.json({
    user: {
      id: data.user.id,
      name: data.user.name,
      whatsapp_number: data.user.whatsapp_number,
      role: data.user.role,
      onboarding_completed: data.user.onboarding_completed,
      current_step: data.user.current_step,
      created_at: data.user.created_at,
      updated_at: data.user.updated_at
    },
    profile: formatProfileResponse(data.profile),
    preferences: data.preferences
      ? {
          preferred_min_age: data.preferences.preferred_min_age,
          preferred_max_age: data.preferences.preferred_max_age,
          preferred_min_height: data.preferences.preferred_min_height,
          preferred_max_height: data.preferences.preferred_max_height
        }
      : null,
    focuses: data.focuses.map((f) => f.focus_option),
    preferred_builds: data.builds.map((b) => b.preferred_build),
    photos: data.photos.map((p) => ({ image_url: p.image_url, photo_type: p.photo_type, upload_order: p.upload_order }))
  });
}

export async function uploadPhoto(req, res) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");

  if (!req.file) {
    throw new ApiError(400, "No file uploaded in request ('file' expected)");
  }

  const bucketName = process.env.SUPABASE_USER_PHOTOS_BUCKET || "user-photos";
  const ext = path.extname(req.file.originalname) || ".jpg";
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const filePath = `${userId}/${timestamp}-${random}${ext}`;

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: true
    });

  if (error) {
    throw new ApiError(500, `Supabase Storage Error: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  return res.status(201).json({
    image_url: publicUrlData.publicUrl,
    path: filePath
  });
}
