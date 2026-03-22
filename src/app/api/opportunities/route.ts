import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseClients";
import { opportunityBaseId, opportunityFullId } from "@/lib/idGenerators";
import type { Opportunity, OpportunitySnapshot } from "@/lib/opportunityTypes";

const PREFIX = "Q26";
const CATEGORY_LETTER = "E";

type OpportunityInsertInput = {
  projectName: string;
  location: string;
  client: string;
  contactPerson: string;
  contact: string;
  description: string;
  vat: string;
  estimatedAmount: number;
  submittedAmount: number;
};

/** Form labels → Supabase `vat` boolean: VAT Inc. = true, VAT Ex. = false */
function vatFormStringToBoolean(vat: string): boolean {
  const v = vat.trim().toLowerCase();
  return v.includes("inc");
}

/**
 * Coerce money for Postgres numeric: numbers, or strings like "12,500.50".
 */
function normalizeMoney(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const n = parseFloat(value.replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

/**
 * public.opportunities — columns (Supabase):
 * id, project_name, location, client_name, opportunity_id, base_code, version,
 * estimated_amount, status, created_at, contact_person, contact, description,
 * vat (boolean), submitted_amount, updated_at
 */
type OpportunityRow = {
  id: string;
  project_name: string;
  location: string;
  client_name: string;
  opportunity_id: string;
  base_code: string;
  version: number;
  estimated_amount: number | string;
  status: string;
  created_at: string;
  contact_person: string | null;
  contact: string | null;
  description: string | null;
  /** DB column is boolean; legacy rows may still be string */
  vat: boolean | string | null;
  submitted_amount: number | string | null;
  updated_at: string | null;
};

function snapshotVatFromRow(v: boolean | string | null | undefined): OpportunitySnapshot["vat"] {
  if (typeof v === "boolean") {
    return v ? "VAT Inc." : "VAT Ex.";
  }
  if (typeof v === "string" && v.toLowerCase().includes("inc")) {
    return "VAT Inc.";
  }
  return "VAT Ex.";
}

const OPPORTUNITY_COLUMNS =
  "id,project_name,location,client_name,opportunity_id,base_code,version,estimated_amount,status,created_at,contact_person,contact,description,vat,submitted_amount,updated_at" as const;

function extractSequenceFromBaseCode(baseCode: string): number {
  const match = baseCode.match(/^[A-Z0-9]+-[A-Z](\d{4})$/i);
  if (!match) return 0;
  return Number(match[1]);
}

async function getZohoAccessToken(): Promise<string> {
  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN;
  const accountsUrl = process.env.ZOHO_ACCOUNTS_URL ?? "https://accounts.zoho.com";

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing Zoho credentials. Ensure ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and ZOHO_REFRESH_TOKEN are set.",
    );
  }

  const tokenUrl = `${accountsUrl}/oauth/v2/token`;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const json = (await response.json()) as { access_token?: string; error?: string };
  if (!response.ok || !json.access_token) {
    throw new Error(json.error ?? "Unable to retrieve Zoho access token.");
  }
  return json.access_token;
}

async function syncZohoDeal(input: {
  opportunityId: string;
  projectName: string;
  client: string;
  location: string;
  description: string;
  submittedAmount: number;
}) {
  const accessToken = await getZohoAccessToken();
  const apiDomain = process.env.ZOHO_API_DOMAIN ?? "https://www.zohoapis.com";

  const payload = {
    data: [
      {
        Deal_Name: input.projectName,
        Account_Name: input.client,
        Description: `${input.description}\nLocation: ${input.location}`,
        Amount: input.submittedAmount,
        Custom_Opportunity_ID: input.opportunityId,
      },
    ],
  };

  const response = await fetch(`${apiDomain}/crm/v2/Deals`, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Zoho Deals sync failed: ${text}`);
  }
}

function rowToOpportunity(row: OpportunityRow): Opportunity {
  const createdAtMs = Date.parse(row.created_at);
  const updatedAtMs = row.updated_at ? Date.parse(row.updated_at) : Number.NaN;
  const sequence = extractSequenceFromBaseCode(row.base_code);
  const safeCreatedAt = Number.isNaN(createdAtMs) ? Date.now() : createdAtMs;
  const safeUpdatedAt = Number.isNaN(updatedAtMs) ? safeCreatedAt : updatedAtMs;

  const estimated = normalizeMoney(row.estimated_amount);
  const submitted = normalizeMoney(row.submitted_amount, estimated);

  const snapshot: OpportunitySnapshot = {
    version: row.version,
    fullId: row.opportunity_id,
    status: row.status as OpportunitySnapshot["status"],
    createdAt: safeCreatedAt,
    projectName: row.project_name,
    location: row.location,
    client: row.client_name,
    contactPerson: row.contact_person ?? "",
    contact: row.contact ?? "",
    description: row.description ?? "",
    vat: snapshotVatFromRow(row.vat),
    estimatedAmount: estimated,
    submittedAmount: submitted,
  };

  return {
    baseId: row.base_code,
    sequence,
    prefix: PREFIX,
    categoryLetter: CATEGORY_LETTER,
    createdAt: safeCreatedAt,
    updatedAt: safeUpdatedAt,
    versions: [snapshot],
  };
}

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("opportunities")
      .select(OPPORTUNITY_COLUMNS)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const opportunities = ((data ?? []) as OpportunityRow[]).map(rowToOpportunity);
    return NextResponse.json({ opportunities }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch opportunities.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OpportunityInsertInput;

    const estimatedAmount = normalizeMoney(body.estimatedAmount);
    const submittedAmount = normalizeMoney(body.submittedAmount);
    const vatBoolean = vatFormStringToBoolean(
      typeof body.vat === "string" ? body.vat : "VAT Ex.",
    );

    const supabase = createSupabaseServerClient();
    const { data: latestRows, error: latestError } = await supabase
      .from("opportunities")
      .select("base_code");

    if (latestError) {
      console.error("Supabase Error:", latestError);
      return NextResponse.json({ error: latestError.message }, { status: 500 });
    }

    const latestSequence = (latestRows ?? []).reduce((max, row) => {
      const code = (row as { base_code?: string }).base_code ?? "";
      const seq = extractSequenceFromBaseCode(code);
      return Math.max(max, seq);
    }, 0);
    const sequence = latestSequence + 1;
    const baseCode = opportunityBaseId(sequence, {
      prefix: PREFIX,
      categoryLetter: CATEGORY_LETTER,
    });
    const opportunityId = opportunityFullId(baseCode, 1);
    const nowIso = new Date().toISOString();

    const insertPayload = {
      base_code: baseCode,
      opportunity_id: opportunityId,
      version: 1,
      status: "Submitted",
      project_name: String(body.projectName ?? "").trim(),
      location: String(body.location ?? "").trim(),
      client_name: String(body.client ?? "").trim(),
      contact_person: String(body.contactPerson ?? "").trim(),
      contact: String(body.contact ?? "").trim(),
      description: String(body.description ?? "").trim(),
      vat: vatBoolean,
      estimated_amount: estimatedAmount,
      submitted_amount: submittedAmount,
      created_at: nowIso,
      updated_at: nowIso,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("opportunities")
      .insert(insertPayload)
      .select(OPPORTUNITY_COLUMNS)
      .single();

    if (insertError) {
      console.error("Supabase Error:", insertError);
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "Duplicate opportunity ID detected. Please try again." },
          { status: 409 },
        );
      }
      return NextResponse.json(
        {
          error: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
        },
        { status: 500 },
      );
    }

    let zohoSynced = false;
    let zohoError: string | null = null;
    try {
      await syncZohoDeal({
        opportunityId,
        projectName: body.projectName,
        client: body.client,
        location: body.location,
        description: body.description,
        submittedAmount: submittedAmount,
      });
      zohoSynced = true;
    } catch (error) {
      zohoError = error instanceof Error ? error.message : "Zoho sync failed.";
      console.error("Zoho sync error:", zohoError);
    }

    return NextResponse.json(
      {
        opportunity: rowToOpportunity(inserted as OpportunityRow),
        zohoSynced,
        zohoError,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Supabase Error:", error);
    const message = error instanceof Error ? error.message : "Failed to create opportunity.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
