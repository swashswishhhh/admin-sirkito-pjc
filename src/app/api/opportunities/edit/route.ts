import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseClients";
import type { OpportunityStatus } from "@/lib/opportunityTypes";

type EditInput = {
  opportunityId: string;
  dateStarted?: string | null;
  dateEnded?: string | null;
  status?: OpportunityStatus;
  finalAmountAfterDiscount?: number | null;
};

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as EditInput;
    const opportunityId = body.opportunityId?.trim();
    if (!opportunityId) {
      return NextResponse.json({ error: "Missing opportunityId" }, { status: 400 });
    }

    const status: OpportunityStatus | undefined =
      body.status === "Awarded" ? "Awarded" : body.status === "Bidding" ? "Bidding" : undefined;

    const payload: Record<string, unknown> = {
      ...(body.dateStarted !== undefined ? { date_started: body.dateStarted } : {}),
      ...(body.dateEnded !== undefined ? { date_ended: body.dateEnded } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(body.finalAmountAfterDiscount !== undefined
        ? { final_amount_after_discount: body.finalAmountAfterDiscount }
        : {}),
      // keep updated_at consistent
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

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to edit opportunity.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

