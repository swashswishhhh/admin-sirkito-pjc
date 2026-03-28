import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseClients";
import type { OpportunityStatus } from "@/lib/opportunityTypes";
import { syncZohoDealUpsertByCustomId } from "@/lib/zohoCrmDeals";

type EditInput = {
  opportunityId: string;
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
  status?: OpportunityStatus;
  finalAmountAfterDiscount?: number | null;
};

function vatFormStringToBoolean(vat: string): boolean {
  const v = vat.trim().toLowerCase();
  return v.includes("inc");
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

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as EditInput;
    const opportunityId = body.opportunityId?.trim();
    if (!opportunityId) {
      return NextResponse.json({ error: "Missing opportunityId" }, { status: 400 });
    }

    const status: OpportunityStatus =
      body.status === "Awarded" ? "Awarded" : "Bidding";

    const estimatedForDb = Number(normalizeMoney(body.estimatedAmount));
    const submittedForDb = Number(normalizeMoney(body.submittedAmount));
    if (!Number.isFinite(estimatedForDb) || !Number.isFinite(submittedForDb)) {
      return NextResponse.json(
        { error: "Invalid estimated or submitted amount (must be numbers)." },
        { status: 400 },
      );
    }

    const vatBoolean = vatFormStringToBoolean(
      typeof body.vat === "string" ? body.vat : "VAT Ex.",
    );

    const finalRaw = body.finalAmountAfterDiscount;
    const finalForDb =
      finalRaw === null || finalRaw === undefined
        ? null
        : Number(normalizeMoney(finalRaw, NaN));
    const finalAmountAfterDiscount =
      finalForDb !== null && Number.isFinite(finalForDb) ? finalForDb : null;

    const payload: Record<string, unknown> = {
      project_name: String(body.projectName ?? "").trim(),
      location: String(body.location ?? "").trim(),
      client_name: String(body.client ?? "").trim(),
      contact_person: String(body.contactPerson ?? "").trim(),
      contact: String(body.contact ?? "").trim(),
      description: String(body.description ?? "").trim(),
      vat: vatBoolean,
      estimated_amount: estimatedForDb,
      submitted_amount: submittedForDb,
      date_started: body.dateStarted ?? null,
      date_ended: body.dateEnded ?? null,
      status,
      final_amount_after_discount: finalAmountAfterDiscount,
      updated_at: new Date().toISOString(),
    };

    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from("opportunities")
      .update(payload)
      .eq("opportunity_id", opportunityId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let zohoSynced = false;
    let zohoError: string | null = null;
    try {
      await syncZohoDealUpsertByCustomId({
        lookupCustomOpportunityId: opportunityId,
        fields: {
          Deal_Name: payload.project_name as string,
          Account_Name: payload.client_name as string,
          Description: `${payload.description as string}\nLocation: ${payload.location as string}`,
          Amount: submittedForDb,
          Custom_Opportunity_ID: opportunityId,
        },
      });
      zohoSynced = true;
    } catch (err) {
      zohoError = err instanceof Error ? err.message : "Zoho sync failed.";
      console.error("Zoho sync error (edit):", zohoError);
    }

    return NextResponse.json({ ok: true, zohoSynced, zohoError }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to edit opportunity.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
