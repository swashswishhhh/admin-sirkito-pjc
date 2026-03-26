import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseClients";
import { computeNextOpportunityPreview } from "@/lib/opportunityIdSequence";
import { categoryCodeFromDescription, yearPrefix } from "@/lib/idGenerators";

/**
 * Returns the next opportunity IDs based on the row with the latest `created_at`
 * (same logic as POST insert). Empty table → Q26-E0001-V1.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const description = url.searchParams.get("description") ?? "";
    const categoryCode = description ? categoryCodeFromDescription(description) : null;
    const prefixOverride = url.searchParams.get("yearPrefix") ?? null;
    const sequenceStartRaw = url.searchParams.get("sequenceStart") ?? null;
    const sequenceStart =
      sequenceStartRaw !== null ? Number(sequenceStartRaw) : 1;

    const prefix = prefixOverride?.trim() || yearPrefix();

    const supabase = createSupabaseServerClient();
    const query = supabase
      .from("opportunities")
      .select("base_code")
      .order("created_at", { ascending: false })
      .limit(1);

    const { data, error } = categoryCode
      ? await query.ilike("base_code", `${prefix}-${categoryCode}%`).maybeSingle()
      : await query.maybeSingle();

    if (error) {
      console.error("Supabase Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const latestBaseCode = data?.base_code ?? null;
    const next = computeNextOpportunityPreview(latestBaseCode, {
      prefix,
      categoryCode: categoryCode ?? undefined,
      sequenceStart,
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
