/**
 * Common GST number validation, formatting, and masking utilities.
 *
 * GSTIN Structure (15 characters):
 * - Characters 1-2:   State code (numeric digits 01-37)
 * - Characters 3-12:  PAN number (5 uppercase letters, 4 digits, 1 uppercase letter)
 * - Character 13:     Entity registration code (alphanumeric 1-9, A-Z)
 * - Character 14:     Default letter 'Z'
 * - Character 15:     Checksum digit/character (alphanumeric)
 *
 * Masking format:
 * - Original GST Number: 27AAAAA1111A1Z5
 * - Masked GST Number:   27XXXXXXXXXX1Z5
 * (First 2 characters visible, middle 10 characters PAN masked with 'X', final 3 characters visible)
 */

export const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const isValidGstin = (gst?: string | null): boolean => {
  if (!gst) return false;
  return GST_REGEX.test(gst.trim().toUpperCase());
};

/**
 * Applies masking to Indian GSTIN:
 * Keeps first 2 chars visible, masks next 10 chars with 'X', keeps final 3 chars visible.
 * Example: 27AAAAA1111A1Z5 -> 27XXXXXXXXXX1Z5
 */
export const maskGstNumber = (gst?: string | null): string => {
  if (!gst) return '';
  const clean = gst.trim().toUpperCase();
  if (clean.length === 15) {
    return `${clean.slice(0, 2)}XXXXXXXXXX${clean.slice(12, 15)}`;
  }
  if (clean.length > 5) {
    const first = clean.slice(0, 2);
    const last = clean.slice(clean.length - 3);
    const maskLen = clean.length - 5;
    return `${first}${'X'.repeat(maskLen)}${last}`;
  }
  return clean;
};

/**
 * Checks whether a given string is a masked GST number representation.
 */
export const isMaskedGst = (val?: string | null): boolean => {
  if (!val) return false;
  return /X{5,}/.test(val);
};

/**
 * Prevents accidentally saving a masked string (e.g. 27XXXXXXXXXX1Z5)
 * over the original unmasked GST number.
 */
export const resolveGstForSave = (currentInput: string, originalGstin: string): string => {
  const trimmed = (currentInput || '').trim().toUpperCase();
  if (!trimmed) return '';
  if (isMaskedGst(trimmed) || (originalGstin && trimmed === maskGstNumber(originalGstin))) {
    return (originalGstin || '').trim().toUpperCase();
  }
  return trimmed;
};

export const GST_VALIDATION_MESSAGE =
  'Invalid GSTIN format. A valid GSTIN must contain 15 characters (e.g. 27AAAAA1111A1Z5): 2-digit State code + 10-char PAN + 1-char Entity code + Z + 1-char Checksum.';
