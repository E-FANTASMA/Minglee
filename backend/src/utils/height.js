const CM_PER_INCH = 2.54;

export function centimetersToFeetInches(value) {
  if (value == null) return null;

  const totalInches = Math.round(Number(value) / CM_PER_INCH);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;

  return { feet, inches };
}

export function feetInchesToCentimeters(value) {
  if (value == null) return undefined;

  const totalInches = value.feet * 12 + value.inches;
  return Math.round(totalInches * CM_PER_INCH);
}

export function normalizeHeightInput(value) {
  if (value == null) return undefined;
  if (typeof value === "number") return value;

  return feetInchesToCentimeters(value);
}
