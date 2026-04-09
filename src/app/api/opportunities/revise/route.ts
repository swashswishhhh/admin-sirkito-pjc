import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseClients";

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
    
    // Call the database Stored Procedure (RPC) to handle the entire copy-on-write 
    // duplication process transactionally within the database.
    const { data: nextOpportunityId, error } = await supabase.rpc("revise_opportunity", {
      p_opportunity_id: opportunityId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!nextOpportunityId) {
        return NextResponse.json({ error: "Failed to create new version." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, newOpportunityId: nextOpportunityId }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to revise opportunity.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

