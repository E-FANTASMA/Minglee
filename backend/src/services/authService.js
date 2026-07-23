import bcrypt from "bcryptjs";
import { supabase } from "../supabase.js";
import { ApiError } from "../utils/apiError.js";
import { normalizeWhatsappNumber } from "../utils/whatsappNumber.js";

export async function signup({ name, whatsapp_number, password }) {
  const normalizedWhatsappNumber = normalizeWhatsappNumber(whatsapp_number);
  if (!normalizedWhatsappNumber) {
    throw new ApiError(400, "Invalid WhatsApp number format");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const { data, error } = await supabase
    .from("users")
    .insert({ name, whatsapp_number: normalizedWhatsappNumber, password_hash: passwordHash })
    .select("id,name,whatsapp_number,role,onboarding_completed,current_step,created_at,updated_at")
    .single();

  if (error) throw new ApiError(400, "Unable to create user", { message: error.message, details: error.details });
  return data;
}

export async function login({ whatsapp_number, password }) {
  const normalizedWhatsappNumber = normalizeWhatsappNumber(whatsapp_number);
  if (!normalizedWhatsappNumber) throw new ApiError(401, "Invalid credentials");

  const { data: user, error } = await supabase
    .from("users")
    .select("id,name,whatsapp_number,password_hash,role,onboarding_completed,current_step,created_at,updated_at")
    .eq("whatsapp_number", normalizedWhatsappNumber)
    .maybeSingle();

  if (error) throw new ApiError(400, "Database error", { message: error.message, details: error.details });
  if (!user) throw new ApiError(401, "Invalid credentials");

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw new ApiError(401, "Invalid credentials");

  // Don't leak password_hash
  // eslint-disable-next-line no-unused-vars
  const { password_hash: _passwordHash, ...safeUser } = user;
  return safeUser;
}
