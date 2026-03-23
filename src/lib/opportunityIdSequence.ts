import { opportunityBaseId, opportunityFullId, yearPrefix } from "./idGenerators";

export type ParsedBaseCode = {
  prefix: string;
  categoryCode: string;
  sequence: number;
};

/**
 * Parse a numeric sequence from `base_code`.
 *
 * Supported patterns:
 * - Legacy: `Q26-E0001` (categoryCode = "E")
 * - New: `Q27-MP0002` (categoryCode = "MP")
 */
export function parseBaseCode(baseCode: string): ParsedBaseCode | null {
  const raw = baseCode.trim();
  const match = raw.match(/^((?:Q\d{2}))-([A-Z0-9]+)(\d{4})$/i);
  if (!match) return null;

  return {
    prefix: match[1].toUpperCase(),
    categoryCode: match[2].toUpperCase(),
    sequence: Number(match[3]),
  };
}

export function parseSequenceFromBaseCode(baseCode: string): number {
  const parsed = parseBaseCode(baseCode);
  return parsed?.sequence ?? 0;
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
  opts?: { prefix?: string; categoryCode?: string },
): NextOpportunityPreview {
  const parsedLatest = latestBaseCode ? parseBaseCode(latestBaseCode) : null;
  const prefix = opts?.prefix ?? parsedLatest?.prefix ?? yearPrefix();
  const categoryCode = opts?.categoryCode ?? parsedLatest?.categoryCode ?? "X";

  const lastSeq = parsedLatest?.sequence ?? 0;
  const sequence = lastSeq < 1 ? 1 : lastSeq + 1; // empty table => ...0001

  const baseCode = opportunityBaseId(sequence, { prefix, categoryCode });
  const fullId = opportunityFullId(baseCode, 1);

  return { sequence, baseCode, fullId };
}
