// Thai phone-number helpers for credential login/registration.
//
// We store and compare phone numbers in a normalized local form: digits only,
// 10 digits starting with "0" (e.g. "0812345678"). Common input variants
// (+66 prefix, spaces, dashes) are accepted and normalized.

/** Normalize user input to a 10-digit local Thai number, or "" if not valid. */
export function normalizePhone(input: string): string {
  let digits = (input || "").replace(/\D/g, "");

  // Convert +66 / 66 international prefix to a leading 0.
  if (digits.startsWith("66") && digits.length === 11) {
    digits = "0" + digits.slice(2);
  }

  return isValidPhone(digits) ? digits : "";
}

/** True for a 10-digit local Thai mobile/landline number starting with 0. */
export function isValidPhone(digits: string): boolean {
  return /^0\d{9}$/.test(digits);
}

/** Pretty grouping for display: 081-234-5678. */
export function formatPhone(digits: string): string {
  const d = (digits || "").replace(/\D/g, "").slice(0, 10);
  const parts = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 10)].filter(Boolean);
  return parts.join("-");
}
