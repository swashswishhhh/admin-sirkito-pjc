import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseClients";
import type { OpportunityStatus } from "@/lib/opportunityTypes";

type EditInput = {
  opportunityId: string;
  // Status & dates
  status?: OpportunityStatus;
  dateStarted?: string | null;
  dateEnded?: string | null;
  finalAmountAfterDiscount?: number | null;
  // Full-edit fields
  projectName?: string;
  location?: string;
  client?: string;
  contactPerson?: string;
  contact?: string;
  description?: string;
  vat?: string; // "VAT Inc." | "VAT Ex."
  estimatedAmount?: number;
  submittedAmount?: number;
};

function vatFormStringToBoolean(vat: string): boolean {
  return vat.trim().toLowerCase().includes("inc");
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as EditInput;
    const opportunityId = body.opportunityId?.trim();
    if (!opportunityId) {
      return NextResponse.json({ error: "Missing opportunityId" }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();

    // ── We allow editing of historical versions now ──
    const { error: fetchError } = await supabase
      .from("opportunities")
      .select("is_read_only")
      .eq("opportunity_id", opportunityId)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }


    const status: OpportunityStatus | undefined =
      body.status === "Awarded" ? "Awarded" : body.status === "Bidding" ? "Bidding" : undefined;

    const payload: Record<string, unknown> = {
      // Always update timestamp
      updated_at: new Date().toISOString(),
    };

    // Status & dates
    if (status !== undefined) payload.status = status;
    if (body.dateStarted !== undefined) payload.date_started = body.dateStarted;
    if (body.dateEnded !== undefined) payload.date_ended = body.dateEnded;
    if (body.finalAmountAfterDiscount !== undefined)
      payload.final_amount_after_discount = body.finalAmountAfterDiscount;

    // Full-edit fields
    if (body.projectName !== undefined) payload.project_name = body.projectName.trim();
    if (body.location !== undefined) payload.location = body.location.trim();
    if (body.client !== undefined) payload.client_name = body.client.trim();
    if (body.contactPerson !== undefined) payload.contact_person = body.contactPerson.trim();
    if (body.contact !== undefined) payload.contact = body.contact.trim();
    if (body.description !== undefined) payload.description = body.description.trim();
    if (body.vat !== undefined) payload.vat = vatFormStringToBoolean(body.vat);
    if (body.estimatedAmount !== undefined) payload.estimated_amount = body.estimatedAmount;
    if (body.submittedAmount !== undefined) payload.submitted_amount = body.submittedAmount;

    const { error } = await supabase
      .from("opportunities")
      .update(payload)
      .eq("opportunity_id", opportunityId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to edit opportunity.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

