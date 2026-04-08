import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseClients";
import { categoryCodeFromDescription, yearPrefix } from "@/lib/idGenerators";
import {
  computeNextOpportunityPreview,
  parseBaseCode,
} from "@/lib/opportunityIdSequence";
import type { Opportunity, OpportunitySnapshot } from "@/lib/opportunityTypes";

/** Fallback when `parseBaseCode` fails on legacy rows; new inserts use `yearPrefix()` (Q26/Q27…) and `categoryCodeFromDescription()` (e.g. MP). */
const PREFIX = "Q26";
const CATEGORY_CODE = "E";

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
  dateStarted?: string | null;
  dateEnded?: string | null;
  status?: OpportunitySnapshot["status"];
  finalAmountAfterDiscount?: number | null;

  /** Optional admin overrides (from Settings UI). */
  yearPrefixOverride?: string | null;
  sequenceStart?: number | null;
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
  final_amount_after_discount: number | string | null;
  status: string;
  created_at: string;
  date_started: string | null;
  date_ended: string | null;
  contact_person: string | null;
  contact: string | null;
  description: string | null;
  /** DB column is boolean; legacy rows may still be string */
  vat: boolean | string | null;
  submitted_amount: number | string | null;
  updated_at: string | null;
  /** Copy-on-Write lock: true = historical version, cannot be edited. */
  is_read_only: boolean | null;
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
  "id,project_name,location,client_name,opportunity_id,base_code,version,estimated_amount,status,created_at,date_started,date_ended,final_amount_after_discount,contact_person,contact,description,vat,submitted_amount,updated_at,is_read_only" as const;

const DUPLICATE_INSERT_MAX_ATTEMPTS = 12;

async function fetchLatestBaseCodeByCreatedAt(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  opts: { prefix: string; categoryCode: string },
): Promise<{
  latestBaseCode: string | null;
  error: { message: string } | null;
}> {
  const { data, error } = await supabase
    .from("opportunities")
    .select("base_code")
    .ilike("base_code", `${opts.prefix}-${opts.categoryCode}%`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { latestBaseCode: null, error: { message: error.message } };
  }
  return { latestBaseCode: data?.base_code ?? null, error: null };
}

/** Reads Zoho OAuth env vars; throws if any required value is missing (build-safe + runtime). */
type ZohoOAuthEnv = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accountsUrl: string;
};

function readZohoOAuthEnvOrThrow(): ZohoOAuthEnv {
  const clientId = process.env.ZOHO_CLIENT_ID?.trim();
  const clientSecret = process.env.ZOHO_CLIENT_SECRET?.trim();
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN?.trim();
  const accountsUrl =
    process.env.ZOHO_ACCOUNTS_URL?.trim() || "https://accounts.zoho.com";

  // Single guard so TypeScript narrows to `string` for all three below.
  if (!clientId || !clientSecret || !refreshToken) {
    const missing: string[] = [];
    if (!clientId) missing.push("ZOHO_CLIENT_ID");
    if (!clientSecret) missing.push("ZOHO_CLIENT_SECRET");
    if (!refreshToken) missing.push("ZOHO_REFRESH_TOKEN");
    throw new Error(
      `Missing Zoho Configuration: ${missing.join(", ")}. Set these in Vercel → Environment Variables (Production) and redeploy.`,
    );
  }

  return {
    clientId,
    clientSecret,
    refreshToken,
    accountsUrl,
  };
}

/** Zoho refresh flow only — never use `grant_type=authorization_code` here (that is one-time code exchange). */
const ZOHO_REFRESH_GRANT_TYPE = "refresh_token" as const;

type ZohoTokenJson = {
  access_token?: string;
  api_domain?: string;
  error?: string;
  error_description?: string;
};

async function getZohoAccessToken(): Promise<{
  accessToken: string;
  apiDomain: string;
}> {
  console.log("Using Refresh Token:", !!process.env.ZOHO_REFRESH_TOKEN);

  const { clientId, clientSecret, refreshToken, accountsUrl } =
    readZohoOAuthEnvOrThrow();

  const tokenUrl = `${accountsUrl}/oauth/v2/token`;
  const body = new URLSearchParams();
  body.set("grant_type", ZOHO_REFRESH_GRANT_TYPE);
  body.set("refresh_token", refreshToken);
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const raw = await response.text();
  let json: ZohoTokenJson;
  try {
    json = JSON.parse(raw) as ZohoTokenJson;
  } catch {
    throw new Error(
      `Zoho token endpoint returned non-JSON (status ${response.status}).`,
    );
  }

  if (response.ok && json.access_token) {
    const fromToken = json.api_domain?.trim();
    const apiDomain =
      fromToken ||
      process.env.ZOHO_API_DOMAIN?.trim() ||
      "https://www.zohoapis.com";
    return { accessToken: json.access_token, apiDomain };
  }

  const err = json.error ?? "Unable to retrieve Zoho access token.";
  const detail = json.error_description?.trim();
  const message = detail ? `${err} — ${detail}` : err;
  console.error("Zoho token refresh failed:", {
    status: response.status,
    error: json.error,
    error_description: json.error_description,
    grant_type: ZOHO_REFRESH_GRANT_TYPE,
  });
  throw new Error(message);
}

async function syncZohoDeal(input: {
  opportunityId: string;
  projectName: string;
  client: string;
  location: string;
  description: string;
  submittedAmount: number;
}) {
  const { accessToken, apiDomain } = await getZohoAccessToken();
  const amount = Number(input.submittedAmount);
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  const payload = {
    data: [
      {
        Deal_Name: input.projectName,
        Account_Name: input.client,
        Description: `${input.description}\nLocation: ${input.location}`,
        Amount: safeAmount,
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
  const parsed = parseBaseCode(row.base_code);
  const sequence = parsed?.sequence ?? 0;
  const safeCreatedAt = Number.isNaN(createdAtMs) ? Date.now() : createdAtMs;
  const safeUpdatedAt = Number.isNaN(updatedAtMs) ? safeCreatedAt : updatedAtMs;

  const estimated = normalizeMoney(row.estimated_amount);
  const submitted = normalizeMoney(row.submitted_amount, estimated);
  const finalAfterDiscount = normalizeMoney(
    row.final_amount_after_discount,
    NaN,
  );
  const finalAfterDiscountOrNull = Number.isFinite(finalAfterDiscount)
    ? finalAfterDiscount
    : null;

  const allowedStatus: OpportunitySnapshot["status"] =
    row.status === "Awarded" ? "Awarded" : "Bidding";

  const snapshot: OpportunitySnapshot = {
    version: row.version,
    fullId: row.opportunity_id,
    status: allowedStatus,
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

    dateStarted: row.date_started ?? null,
    dateEnded: row.date_ended ?? null,
    finalAmountAfterDiscount: finalAfterDiscountOrNull,
    isReadOnly: row.is_read_only === true,
  };

  return {
    baseId: row.base_code,
    sequence,
    prefix: parsed?.prefix ?? PREFIX,
    categoryCode: parsed?.categoryCode ?? CATEGORY_CODE,
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

    const rows = (data ?? []) as OpportunityRow[];
    const byBaseId = new Map<string, Opportunity>();

    for (const row of rows) {
      const partial = rowToOpportunity(row);
      const existing = byBaseId.get(partial.baseId);
      if (!existing) {
        byBaseId.set(partial.baseId, partial);
        continue;
      }

      // Merge this snapshot into the versions list.
      existing.versions.push(partial.versions[0]);
      existing.updatedAt = Math.max(existing.updatedAt, partial.updatedAt);
      existing.createdAt = Math.min(existing.createdAt, partial.createdAt);
    }

    const opportunities = Array.from(byBaseId.values()).map((o) => {
      const versions = [...o.versions].sort((a, b) => a.version - b.version);
      return { ...o, versions };
    });

    opportunities.sort((a, b) => b.updatedAt - a.updatedAt);
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

    const estimatedForDb = Number(estimatedAmount);
    const submittedForDb = Number(submittedAmount);
    if (!Number.isFinite(estimatedForDb) || !Number.isFinite(submittedForDb)) {
      return NextResponse.json(
        { error: "Invalid estimated or submitted amount (must be numbers)." },
        { status: 400 },
      );
    }

    const supabase = createSupabaseServerClient();
    const nowIso = new Date().toISOString();

    // Opportunity IDs: calendar year → Qyy (e.g. 2026 → Q26); description → category (e.g. Mechanical + Plumbing → MP).
    const prefix = body.yearPrefixOverride?.trim() || yearPrefix();
    const categoryCode = categoryCodeFromDescription(body.description ?? "");
    const sequenceStart = body.sequenceStart ?? 1;

    const status: OpportunitySnapshot["status"] =
      body.status === "Awarded" ? "Awarded" : "Bidding";
    const dateStarted = body.dateStarted ?? null;
    const dateEnded = body.dateEnded ?? null;
    const finalAmountAfterDiscount =
      body.finalAmountAfterDiscount ?? null;

    const insertPayloadBase = {
      version: 1,
      status,
      project_name: String(body.projectName ?? "").trim(),
      location: String(body.location ?? "").trim(),
      client_name: String(body.client ?? "").trim(),
      contact_person: String(body.contactPerson ?? "").trim(),
      contact: String(body.contact ?? "").trim(),
      description: String(body.description ?? "").trim(),
      vat: vatBoolean,
      estimated_amount: estimatedForDb,
      submitted_amount: submittedForDb,
      date_started: dateStarted,
      date_ended: dateEnded,
      final_amount_after_discount: finalAmountAfterDiscount,
      created_at: nowIso,
      updated_at: nowIso,
    };

    let inserted: OpportunityRow | null = null;

    for (let attempt = 0; attempt < DUPLICATE_INSERT_MAX_ATTEMPTS; attempt++) {
      const { latestBaseCode, error: latestError } =
        await fetchLatestBaseCodeByCreatedAt(supabase, { prefix, categoryCode });

      if (latestError) {
        console.error("Supabase Error:", latestError);
        return NextResponse.json({ error: latestError.message }, { status: 500 });
      }

      const { baseCode, fullId: opportunityId } = computeNextOpportunityPreview(
        latestBaseCode,
        { prefix, categoryCode, sequenceStart },
      );

      const insertPayload = {
        ...insertPayloadBase,
        base_code: baseCode,
        opportunity_id: opportunityId,
      };

      const { data: ins, error: insertError } = await supabase
        .from("opportunities")
        .insert(insertPayload)
        .select(OPPORTUNITY_COLUMNS)
        .single();

      if (!insertError && ins) {
        inserted = ins as OpportunityRow;
        break;
      }

      if (insertError) {
        console.error("Supabase Error:", insertError);
        if (insertError.code === "23505") {
          continue;
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
    }

    if (!inserted) {
      const { latestBaseCode: suggestLatest } = await fetchLatestBaseCodeByCreatedAt(supabase, {
        prefix,
        categoryCode,
      });
      const { fullId: suggestedNextFullId } = computeNextOpportunityPreview(suggestLatest, {
        prefix,
        categoryCode,
        sequenceStart,
      });

      return NextResponse.json(
        {
          error:
            "This Opportunity ID already exists. Please use a different sequence or increment the version.",
          conflictCode: "DUPLICATE_OPPORTUNITY_ID",
          suggestedNextFullId,
        },
        { status: 409 },
      );
    }

    // Zoho only after a successful Supabase insert (no ghost deals on failed insert).
    const savedOpportunityId = inserted.opportunity_id;

    let zohoSynced = false;
    let zohoError: string | null = null;
    try {
      await syncZohoDeal({
        opportunityId: savedOpportunityId,
        projectName: body.projectName,
        client: body.client,
        location: body.location,
        description: body.description,
        submittedAmount: submittedForDb,
      });
      zohoSynced = true;
    } catch (error) {
      zohoError = error instanceof Error ? error.message : "Zoho sync failed.";
      console.error("Zoho sync error:", zohoError);
    }

    return NextResponse.json(
      {
        opportunity: rowToOpportunity(inserted),
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
