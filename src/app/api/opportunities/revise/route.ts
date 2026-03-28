import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseClients";
import { opportunityFullId } from "@/lib/idGenerators";
import { syncZohoDealUpsertByCustomId } from "@/lib/zohoCrmDeals";
import type { OpportunitySnapshot } from "@/lib/opportunityTypes";

type OpportunityRow = {
  opportunity_id: string;
  base_code: string;
  version: number;
  status: string;
  project_name: string;
  location: string;
  client_name: string;
  contact_person: string | null;
  contact: string | null;
  description: string | null;
  vat: boolean | string | null;
  estimated_amount: number | string;
  submitted_amount: number | string | null;
  date_started: string | null;
  date_ended: string | null;
  final_amount_after_discount: number | string | null;
  created_at: string;
  updated_at: string | null;
};

type ReviseInput = {
  opportunityId: string;
};

const OPPORTUNITY_COLUMNS =
  "id,project_name,location,client_name,opportunity_id,base_code,version,estimated_amount,status,created_at,date_started,date_ended,final_amount_after_discount,contact_person,contact,description,vat,submitted_amount,updated_at" as const;

function snapshotVatFromRow(v: boolean | string | null | undefined): OpportunitySnapshot["vat"] {
  if (typeof v === "boolean") {
    return v ? "VAT Inc." : "VAT Ex.";
  }
  if (typeof v === "string" && v.toLowerCase().includes("inc")) {
    return "VAT Inc.";
  }
  return "VAT Ex.";
}

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

function rowToSnapshot(row: OpportunityRow): OpportunitySnapshot {
  const createdAtMs = Date.parse(row.created_at);
  const safeCreatedAt = Number.isNaN(createdAtMs) ? Date.now() : createdAtMs;
  const estimated = normalizeMoney(row.estimated_amount);
  const submitted = normalizeMoney(row.submitted_amount, estimated);
  const finalAfterDiscount = normalizeMoney(row.final_amount_after_discount, NaN);
  const finalAfterDiscountOrNull = Number.isFinite(finalAfterDiscount) ? finalAfterDiscount : null;
  const allowedStatus: OpportunitySnapshot["status"] =
    row.status === "Awarded" ? "Awarded" : "Bidding";

  return {
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
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReviseInput;
    const opportunityId = body.opportunityId?.trim();
    if (!opportunityId) {
      return NextResponse.json({ error: "Missing opportunityId" }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();
    const { data: row, error } = await supabase
      .from("opportunities")
      .select("*")
      .eq("opportunity_id", opportunityId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const current = row as unknown as OpportunityRow;
    const previousOpportunityId = current.opportunity_id;
    const nextVersion = Number(current.version) + 1;
    const nowIso = new Date().toISOString();
    const nextOpportunityId = opportunityFullId(current.base_code, nextVersion);

    const insertPayload = {
      base_code: current.base_code,
      opportunity_id: nextOpportunityId,
      version: nextVersion,
      status: current.status,
      project_name: current.project_name,
      location: current.location,
      client_name: current.client_name,
      contact_person: current.contact_person,
      contact: current.contact,
      description: current.description,
      vat: current.vat,
      estimated_amount: current.estimated_amount,
      submitted_amount: current.submitted_amount,
      date_started: current.date_started,
      date_ended: current.date_ended,
      final_amount_after_discount: current.final_amount_after_discount,
      created_at: nowIso,
      updated_at: nowIso,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("opportunities")
      .insert(insertPayload)
      .select(OPPORTUNITY_COLUMNS)
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const newRow = inserted as unknown as OpportunityRow;
    const snapshot = rowToSnapshot(newRow);

    let zohoSynced = false;
    let zohoError: string | null = null;
    try {
      const submittedForZoho = normalizeMoney(newRow.submitted_amount, normalizeMoney(newRow.estimated_amount));
      await syncZohoDealUpsertByCustomId({
        lookupCustomOpportunityId: previousOpportunityId,
        fields: {
          Deal_Name: newRow.project_name,
          Account_Name: newRow.client_name,
          Description: `${newRow.description ?? ""}\nLocation: ${newRow.location}`,
          Amount: Number.isFinite(submittedForZoho) ? submittedForZoho : 0,
          Custom_Opportunity_ID: nextOpportunityId,
        },
      });
      zohoSynced = true;
    } catch (err) {
      zohoError = err instanceof Error ? err.message : "Zoho sync failed.";
      console.error("Zoho sync error (revise):", zohoError);
    }

    return NextResponse.json(
      {
        ok: true,
        newOpportunityId: nextOpportunityId,
        snapshot,
        zohoSynced,
        zohoError,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to revise opportunity.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
