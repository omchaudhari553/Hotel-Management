/**
 * Common phone / mobile number validation and typing sanitization utilities for Hotel Native.
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

export const validatePhoneNumber = (phone: string, language: 'en' | 'mr' | 'hi' = 'en'): string => {
  const trimmed = (phone || '').trim();
  if (!trimmed) {
    if (language === 'mr') return 'कृपया संपर्क क्रमांक भरा.';
    if (language === 'hi') return 'कृपया संपर्क नंबर भरें।';
    return 'Please fill the contact number.';
  }

  if (!isValidMobile(trimmed)) {
    if (language === 'mr') return 'फोन नंबर बरोबर १० अंकी असावा आणि ६, ७, ८ किंवा ९ ने सुरू व्हावा.';
    if (language === 'hi') return 'फ़ोन नंबर ठीक 10 अंकों का होना चाहिए और 6, 7, 8 या 9 से शुरू होना चाहिए।';
    return 'Phone number must be exactly 10 digits and start with 6, 7, 8, or 9.';
  }

  if (/^(\d)\1{9}$/.test(trimmed)) {
    if (language === 'mr') return 'फोन नंबरमध्ये एकाच अंकाची पुनरावृत्ती असू शकत नाही.';
    if (language === 'hi') return 'फ़ोन नंबर में एक ही अंक बार-बार नहीं हो सकता।';
    return 'Phone number cannot contain the same digit repeatedly.';
  }

  return '';
};

