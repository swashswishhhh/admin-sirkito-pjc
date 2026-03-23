import {
  opportunityBaseId,
  opportunityFullId,
  nextVersion,
} from "./idGenerators";
import type { Opportunity, OpportunitySnapshot } from "./opportunityTypes";

export type OpportunityCreateInput = {
  projectName: string;
  location: string;
  client: string;
  contactPerson: string;
  contact: string;
  description: string;
  vat: string;
  estimatedAmount: number;
  submittedAmount: number;
  dateStarted?: string | null;
  dateEnded?: string | null;
  status?: OpportunitySnapshot["status"];
  finalAmountAfterDiscount?: number | null;
  prefix?: string;
  categoryCode?: string;
  sequence: number;
  now?: number; // epoch ms (override for tests)
};

export function createOpportunityDomain(input: OpportunityCreateInput): Opportunity {
  const now = input.now ?? Date.now();
  const prefix = (input.prefix ?? "").trim();
  const categoryCode = (input.categoryCode ?? "").trim();

  const baseId = opportunityBaseId(input.sequence, {
    prefix: prefix || undefined,
    categoryCode: categoryCode || undefined,
  });

  const v1: OpportunitySnapshot = {
    version: 1,
    fullId: opportunityFullId(baseId, 1),
    status: input.status ?? "Bidding",
    createdAt: now,

    projectName: input.projectName.trim(),
    location: input.location.trim(),
    client: input.client.trim(),
    contactPerson: input.contactPerson.trim(),
    contact: input.contact.trim(),
    description: input.description.trim(),
    vat: input.vat.trim(),
    estimatedAmount: input.estimatedAmount,
    submittedAmount: input.submittedAmount,

    dateStarted: input.dateStarted ?? null,
    dateEnded: input.dateEnded ?? null,
    finalAmountAfterDiscount: input.finalAmountAfterDiscount ?? null,
  };

  return {
    baseId,
    sequence: input.sequence,
    prefix,
    categoryCode,
    createdAt: now,
    updatedAt: now,
    versions: [v1],
  };
}

export function reviseOpportunityDomain(opportunity: Opportunity, now?: number): Opportunity {
  const current = opportunity.versions[opportunity.versions.length - 1];
  const nextV = nextVersion(current.version);
  const createdAt = now ?? Date.now();

  // Revision duplicates the same record and updates status.
  const nextSnapshot: OpportunitySnapshot = {
    ...current,
    version: nextV,
    fullId: opportunityFullId(opportunity.baseId, nextV),
    status: current.status, // keep allowed status
    createdAt,
  };

  return {
    ...opportunity,
    updatedAt: createdAt,
    versions: [...opportunity.versions, nextSnapshot],
  };
}

export function getLatestVersion(opportunity: Opportunity): OpportunitySnapshot {
  return opportunity.versions[opportunity.versions.length - 1];
}

export function getCurrentVersionNumber(opportunity: Opportunity): number {
  return getLatestVersion(opportunity).version;
}

