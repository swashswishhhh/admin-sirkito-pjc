const DEFAULT_PREFIX = "Q26";
const DEFAULT_CATEGORY_LETTER = "E";

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

export function opportunityBaseId(sequence: number, opts?: { prefix?: string; categoryLetter?: string }): string {
  const prefix = (opts?.prefix ?? DEFAULT_PREFIX).trim();
  const categoryLetter = (opts?.categoryLetter ?? DEFAULT_CATEGORY_LETTER).trim().slice(0, 1);

  if (!prefix) throw new Error("Prefix is required.");
  if (!categoryLetter) throw new Error("Category letter is required.");

  const seq = assertPositiveInt(sequence, "Sequence");
  const seqStr = seq.toString().padStart(4, "0");
  // Example: Q26-E0002
  return `${prefix}-${categoryLetter}${seqStr}`;
}

export function opportunityFullId(baseId: string, version: number): string {
  const v = assertPositiveInt(version, "Version");
  if (!baseId.trim()) throw new Error("Base ID is required.");
  // Example: Q26-E0002-V1
  return `${baseId}-V${v}`;
}

