export type OpportunityStatus = "Bidding" | "Awarded";

export type VatType = "VAT Ex." | "VAT Inc." | (string & {});

export type OpportunitySnapshot = {
  version: number; // V1, V2, ...
  fullId: string; // Q27-MP0002-Vn
  status: OpportunityStatus;
  createdAt: number; // epoch ms

  // Snapshot fields for this version
  projectName: string;
  location: string;
  client: string;
  contactPerson: string;
  contact: string;
  description: string;
  vat: VatType;
  estimatedAmount: number;
  submittedAmount: number;

  dateStarted: string | null; // Supabase DATE (YYYY-MM-DD) or null
  dateEnded: string | null; // Supabase DATE (YYYY-MM-DD) or null
  finalAmountAfterDiscount: number | null;
};

export type Opportunity = {
  baseId: string; // Q26-E0002
  sequence: number; // 1..n
  prefix: string; // Q27
  categoryCode: string; // MP (variable length)
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
  versions: OpportunitySnapshot[];
};

