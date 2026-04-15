/**
 * Zoho CRM Stage Mapping
 *
 * Maps Sirkito's internal `OpportunityStatus` values to the exact Zoho CRM
 * `Stage` picklist values configured in your pipeline's Stage-Probability Mapping.
 *
 * ─── To update ──────────────────────────────────────────────────────
 * 1. Open Zoho CRM → Setup → Customization → Modules and Fields → Deals
 *    → Stage-Probability Mapping.
 * 2. Copy the exact stage names (spelling, casing, spaces all matter).
 * 3. Update the `STATUS_TO_ZOHO_STAGE` map below.
 * ─────────────────────────────────────────────────────────────────────
 */

/**
 * Sirkito Status  →  Zoho CRM Stage (exact API names)
 *
 * Current mapping (derived from the Zoho Deal form screenshot):
 *   • "Bidding"  → "Qualification"   (first pipeline stage — deal is being bid on)
 *   • "Awarded"  → "Closed Won"      (deal has been awarded)
 */
const STATUS_TO_ZOHO_STAGE: Record<string, string> = {
  Bidding: "Qualification",
  Awarded: "Closed Won",
};

/** All Sirkito status values that have a valid Zoho Stage mapping. */
export const VALID_SIRKITO_STATUSES = Object.keys(STATUS_TO_ZOHO_STAGE);

/**
 * Returns whether the given Sirkito status has a corresponding Zoho Stage mapping.
 */
export function isValidZohoStage(status: string): boolean {
  return status in STATUS_TO_ZOHO_STAGE;
}

/**
 * Maps a Sirkito `OpportunityStatus` to the Zoho CRM `Stage` picklist value.
 *
 * @throws {Error} if no mapping exists — this ensures we never send an
 *   unmapped value and risk another "UnAccounted" incident.
 */
export function mapStatusToZohoStage(status: string): string {
  const stage = STATUS_TO_ZOHO_STAGE[status];
  if (!stage) {
    throw new Error(
      `No Zoho CRM Stage mapping for Sirkito status "${status}". ` +
        `Valid statuses: ${VALID_SIRKITO_STATUSES.join(", ")}. ` +
        `Add a mapping in src/lib/zohoStageMapping.ts.`,
    );
  }
  return stage;
}

/**
 * Returns a human-readable label for the mapped stage (for UI display).
 * Returns `null` if the status has no mapping.
 */
export function getZohoStageLabel(status: string): string | null {
  return STATUS_TO_ZOHO_STAGE[status] ?? null;
}
