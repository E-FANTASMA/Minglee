export function normalizeWhatsappNumber(value) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.length === 10) {
    return `+234${digits}`;
  }

  if (digits.length === 11) {
    return `+234${digits.slice(-10)}`;
  }

  if (digits.length === 13 && digits.startsWith("234")) {
    return `+${digits}`;
  }

  return null;
}
