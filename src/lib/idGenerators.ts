export function yearPrefix(now: Date | number = Date.now()): string {
  const d = typeof now === "number" ? new Date(now) : now;
  const yy = String(d.getFullYear()).slice(-2);
  // Example: 2026 -> Q26
  return `Q${yy}`;
}

const CATEGORY_STOPWORDS = new Set([
  "and",
  "or",
  "the",
  "of",
  "for",
  "to",
  "in",
  "on",
  "with",
  "a",
  "an",
  "&",
]);

/**
 * Convert description into a category code.
 * Example: "Mechanical and Plumbing" -> "MP"
 *
 * Rules (practical default):
 * - Split by non-letters/digits
 * - Take the first letter of each word
 * - Skip common stopwords ("and", "the", etc.)
 * - Uppercase, and keep up to 4 letters
 */
export function categoryCodeFromDescription(description: string): string {
  const tokens = description
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  const letters: string[] = [];
  for (const t of tokens) {
    const raw = t.toLowerCase();
    if (CATEGORY_STOPWORDS.has(raw)) continue;
    const first = t[0];
    if (first && /[A-Z0-9]/.test(first)) letters.push(first);
  }

  const code = letters.join("").slice(0, 4);
  return code || "X";
}

function assertPositiveInt(value: number, name: string): number {
  const n = Math.trunc(value);
  if (!Number.isFinite(n) || n < 1) {
    throw new Error(`${name} must be a positive number.`);
  }
  return n;
}

export function nextVersion(version: number): number {
  return assertPositiveInt(version, "Version") + 1;
}

export function opportunityBaseId(
  sequence: number,
  opts?: { prefix?: string; categoryCode?: string },
): string {
  const prefix = (opts?.prefix ?? yearPrefix()).trim();
  const categoryCode = (opts?.categoryCode ?? "X").trim().toUpperCase().slice(0, 4);

  if (!prefix) throw new Error("Prefix is required.");
  if (!categoryCode) throw new Error("Category code is required.");
  const seq = assertPositiveInt(sequence, "Sequence");
  const seqStr = seq.toString().padStart(4, "0");
  // Example: Q27-MP0002
  return `${prefix}-${categoryCode}${seqStr}`;
}

export function opportunityFullId(baseId: string, version: number): string {
  const v = assertPositiveInt(version, "Version");
  if (!baseId.trim()) throw new Error("Base ID is required.");
  // Example: Q27-MP0002-V1
  return `${baseId}-V${v}`;
}

