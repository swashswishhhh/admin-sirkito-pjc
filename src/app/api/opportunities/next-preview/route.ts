import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseClients";
import { computeNextOpportunityPreview } from "@/lib/opportunityIdSequence";

const PREFIX = "Q26";
const CATEGORY_LETTER = "E";

/**
 * Returns the next opportunity IDs based on the row with the latest `created_at`
 * (same logic as POST insert). Empty table → Q26-E0001-V1.
 */
export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("opportunities")
      .select("base_code")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Supabase Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const latestBaseCode = data?.base_code ?? null;
    const next = computeNextOpportunityPreview(latestBaseCode, {
      prefix: PREFIX,
      categoryLetter: CATEGORY_LETTER,
    });

    return NextResponse.json(
      {
        latestBaseCode,
        nextBaseCode: next.baseCode,
        nextFullId: next.fullId,
        nextSequence: next.sequence,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to compute next ID.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
