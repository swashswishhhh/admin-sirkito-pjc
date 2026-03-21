export type OpportunityStatus = "Submitted" | "Revised" | "Approved" | "Pending" | (string & {});

export type VatType = "VAT Ex." | "VAT Inc." | (string & {});

export type OpportunitySnapshot = {
  version: number; // V1, V2, ...
  fullId: string; // Q26-E0002-Vn
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
};

export type Opportunity = {
  baseId: string; // Q26-E0002
  sequence: number; // 1..n
  prefix: string; // Q26
  categoryLetter: string; // E
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
  versions: OpportunitySnapshot[];
};

