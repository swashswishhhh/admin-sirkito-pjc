import { opportunityBaseId, opportunityFullId } from "./idGenerators";

/**
 * Parse the numeric sequence from a base_code like `Q26-E0001` → 1.
 * Returns 0 if the string does not match the expected pattern.
 */
export function parseSequenceFromBaseCode(baseCode: string): number {
  const match = baseCode.trim().match(/^[A-Z0-9]+-[A-Z](\d{4})$/i);
  if (!match) return 0;
  return Number(match[1]);
}

export type NextOpportunityPreview = {
  sequence: number;
  baseCode: string;
  fullId: string;
};

/**
 * Next ID after the most recently created row's `base_code` (by `created_at`).
 * Empty table → Q26-E0001 / Q26-E0001-V1.
 */
export function computeNextOpportunityPreview(
  latestBaseCode: string | null | undefined,
  opts?: { prefix?: string; categoryLetter?: string },
): NextOpportunityPreview {
  const prefix = opts?.prefix ?? "Q26";
  const categoryLetter = opts?.categoryLetter ?? "E";

  const lastSeq = latestBaseCode ? parseSequenceFromBaseCode(latestBaseCode) : 0;
  const sequence = lastSeq < 1 ? 1 : lastSeq + 1;

  const baseCode = opportunityBaseId(sequence, { prefix, categoryLetter });
  const fullId = opportunityFullId(baseCode, 1);

  return { sequence, baseCode, fullId };
}
