import bcrypt from 'bcryptjs';

export const isBcryptHash = (value) =>
  typeof value === 'string' && value.startsWith('$2');

const sanitizePasswordInput = (value) =>
  String(value || '')
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ')
    .trim();

const compareSinglePassword = async (candidate, normalizedStored) => {
  if (isBcryptHash(normalizedStored)) {
    return bcrypt.compare(candidate, normalizedStored);
  }
  return candidate === normalizedStored;
};

export const verifyStoredPassword = async (providedPassword, storedPassword) => {
  if (!providedPassword || !storedPassword) {
    return false;
  }

  const normalizedProvided = sanitizePasswordInput(providedPassword);
  const normalizedStored = sanitizePasswordInput(storedPassword);

  if (!normalizedProvided || !normalizedStored) {
    return false;
  }

  const exactMatch = await compareSinglePassword(normalizedProvided, normalizedStored);
  if (exactMatch) {
    return true;
  }

  // Mobile keyboard resilience: Android/iOS keyboards frequently auto-capitalize
  // the first letter when typing a password (e.g. "Ritesh@123" vs "ritesh@123").
  if (normalizedProvided.length >= 6 && /^[a-zA-Z]/.test(normalizedProvided)) {
    const firstChar = normalizedProvided[0];
    const toggledFirst =
      firstChar === firstChar.toUpperCase()
        ? firstChar.toLowerCase()
        : firstChar.toUpperCase();
    const toggledCandidate = toggledFirst + normalizedProvided.slice(1);
    if (toggledCandidate !== normalizedProvided) {
      return compareSinglePassword(toggledCandidate, normalizedStored);
    }
  }

  return false;
};
