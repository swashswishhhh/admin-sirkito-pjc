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
  prefix?: string; // defaults to Q26
  categoryLetter?: string; // defaults to E
  sequence: number;
  now?: number; // epoch ms (override for tests)
};

export function createOpportunityDomain(input: OpportunityCreateInput): Opportunity {
  const now = input.now ?? Date.now();
  const prefix = (input.prefix ?? "Q26").trim();
  const categoryLetter = (input.categoryLetter ?? "E").trim().slice(0, 1);

  const baseId = opportunityBaseId(input.sequence, { prefix, categoryLetter });

  const v1: OpportunitySnapshot = {
    version: 1,
    fullId: opportunityFullId(baseId, 1),
    status: "Submitted",
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
  };

  return {
    baseId,
    sequence: input.sequence,
    prefix,
    categoryLetter,
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
    status: "Revised",
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

