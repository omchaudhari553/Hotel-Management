/**
 * Common phone / mobile number validation and typing sanitization utilities.
 *
 * Rules:
 * - Exactly 10 digits
 * - Only numeric digits (0-9)
 * - First digit MUST be 6, 7, 8, or 9
 * - While typing:
 *   - Any first digit that is 0-5 is rejected immediately (input remains empty).
 *   - Non-numeric characters cannot be entered.
 *   - The 11th digit cannot be typed (maximum 10 digits).
 */

export const sanitizeMobileInput = (raw: string): string => {
  if (!raw) return '';
  // Strip non-digit characters
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';

  // First digit MUST be 6, 7, 8, or 9. If not, reject.
  if (!/^[6-9]/.test(digits)) {
    return '';
  }

  // Enforce maximum 10 digits
  return digits.slice(0, 10);
};

export const isValidMobile = (phone: string | null | undefined): boolean => {
  if (!phone) return false;
  return /^[6-9]\d{9}$/.test(phone.trim());
};

export const PHONE_VALIDATION_MESSAGE = 'Mobile number must be exactly 10 digits and start with 6, 7, 8, or 9.';
