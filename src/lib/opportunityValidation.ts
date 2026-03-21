export function validateRequired(value: string, label: string): string | null {
  if (!value || !value.trim()) return `${label} is required.`;
  return null;
}

export function normalizeContact(input: string): string {
  // Keep digits, spaces, +, -, parentheses.
  return input.trim().replace(/[^\d+\-() ]/g, "");
}

export function validateContactNumber(input: string): string | null {
  const normalized = normalizeContact(input);
  const pattern = /^[+]?[\d\s()\-]{7,}$/;
  if (!pattern.test(normalized)) return "Contact number format is invalid.";

  const digitsOnly = normalized.replace(/\D/g, "");
  if (digitsOnly.length < 7) return "Contact number must contain at least 7 digits.";
  if (digitsOnly.length > 15) return "Contact number looks too long.";
  return null;
}

export function parseMoney(input: string, label: string): { value: number; error: string | null } {
  const trimmed = input.trim();
  if (!trimmed) return { value: 0, error: `${label} is required.` };

  const normalized = trimmed.replace(/,/g, "");
  const n = Number(normalized);
  if (!Number.isFinite(n)) return { value: 0, error: `${label} must be a valid number.` };
  if (n < 0) return { value: 0, error: `${label} cannot be negative.` };

  return { value: n, error: null };
}

export function formatMoney(value: number): string {
  try {
    return new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(value);
  } catch {
    return String(value);
  }
}

