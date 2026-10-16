import "../env.js";
import { timingSafeEqual } from "node:crypto";
import { ApiError } from "../utils/apiError.js";

export function adminAuthMiddleware(req, _res, next) {
  const configuredSecret = process.env.ADMIN_SECRET;
  const suppliedSecret = req.get("x-admin-secret") || "";

  if (!configuredSecret) {
    return next(new ApiError(503, "Admin access is not configured on this server"));
  }

  const configuredBuffer = Buffer.from(configuredSecret);
  const suppliedBuffer = Buffer.from(suppliedSecret);
  const secretsMatch =
    configuredBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(configuredBuffer, suppliedBuffer);

  if (!secretsMatch) {
    return next(new ApiError(401, "Invalid admin secret"));
  }

  return next();
}
