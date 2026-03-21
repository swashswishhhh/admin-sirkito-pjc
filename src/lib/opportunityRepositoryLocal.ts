import type { Opportunity } from "./opportunityTypes";

const STORAGE_KEY = "sirkito_opportunities_v3";

export type OpportunityRepository = {
  getAll(): Opportunity[];
  saveAll(opps: Opportunity[]): void;
  clear(): void;
};

export function createLocalOpportunityRepository(): OpportunityRepository {
  function safeParse(value: string | null): Opportunity[] {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isOpportunityLike) as Opportunity[];
    } catch {
      return [];
    }
  }

  function isOpportunityLike(v: unknown): v is Opportunity {
    if (!v || typeof v !== "object") return false;
    const obj = v as Record<string, unknown>;
    if (typeof obj.baseId !== "string") return false;
    if (typeof obj.sequence !== "number") return false;

    const versions = obj.versions;
    if (!Array.isArray(versions) || versions.length === 0) return false;
    const last = versions[versions.length - 1];
    if (!last || typeof last !== "object") return false;

    const lastObj = last as Record<string, unknown>;
    if (typeof lastObj.fullId !== "string") return false;
    if (typeof lastObj.version !== "number") return false;
    if (typeof lastObj.status !== "string") return false;
    // Snapshot fields existence checks (kept minimal)
    if (typeof lastObj.projectName !== "string") return false;
    if (typeof lastObj.estimatedAmount !== "number") return false;
    return true;
  }

  return {
    getAll() {
      if (typeof window === "undefined") return [];
      return safeParse(window.localStorage.getItem(STORAGE_KEY));
    },
    saveAll(opps: Opportunity[]) {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(opps));
    },
    clear() {
      if (typeof window === "undefined") return;
      window.localStorage.removeItem(STORAGE_KEY);
    },
  };
}

export function getNextSequenceFromOpportunities(
  opps: Opportunity[],
): number {
  const maxSeq = opps.reduce((acc, o) => Math.max(acc, o.sequence), 0);
  return maxSeq + 1;
}

