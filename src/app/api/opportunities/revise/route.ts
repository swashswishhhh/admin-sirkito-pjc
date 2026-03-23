import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseClients";
import { opportunityFullId } from "@/lib/idGenerators";

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
};

type ReviseInput = {
  opportunityId: string;
};

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

    const { error: insertError } = await supabase
      .from("opportunities")
      .insert(insertPayload);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to revise opportunity.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

