import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseClients";
import { mapStatusToZohoStage, isValidZohoStage } from "@/lib/zohoStageMapping";

// ── Zoho OAuth (reused from main route) ──────────────────────────────

function readZohoOAuthEnvOrThrow() {
  const clientId = process.env.ZOHO_CLIENT_ID?.trim();
  const clientSecret = process.env.ZOHO_CLIENT_SECRET?.trim();
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN?.trim();
  const accountsUrl =
    process.env.ZOHO_ACCOUNTS_URL?.trim() || "https://accounts.zoho.com";

  if (!clientId || !clientSecret || !refreshToken) {
    const missing: string[] = [];
    if (!clientId) missing.push("ZOHO_CLIENT_ID");
    if (!clientSecret) missing.push("ZOHO_CLIENT_SECRET");
    if (!refreshToken) missing.push("ZOHO_REFRESH_TOKEN");
    throw new Error(`Missing Zoho Configuration: ${missing.join(", ")}.`);
  }

  return { clientId, clientSecret, refreshToken, accountsUrl };
}

async function getZohoAccessToken(): Promise<{
  accessToken: string;
  apiDomain: string;
}> {
  const { clientId, clientSecret, refreshToken, accountsUrl } =
    readZohoOAuthEnvOrThrow();

  const body = new URLSearchParams();
  body.set("grant_type", "refresh_token");
  body.set("refresh_token", refreshToken);
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);

  const response = await fetch(`${accountsUrl}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  const raw = await response.text();
  let json: { access_token?: string; api_domain?: string; error?: string; error_description?: string };
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error(`Zoho token endpoint returned non-JSON (status ${response.status}).`);
  }

  if (response.ok && json.access_token) {
    const apiDomain =
      json.api_domain?.trim() ||
      process.env.ZOHO_API_DOMAIN?.trim() ||
      "https://www.zohoapis.com";
    return { accessToken: json.access_token, apiDomain };
  }

  throw new Error(
    json.error_description ?? json.error ?? "Unable to retrieve Zoho access token.",
  );
}

// ── Types ────────────────────────────────────────────────────────────

type DealFixResult = {
  opportunityId: string;
  status: string;
  zohoRecordId?: string;
  previousStage?: string;
  newStage?: string;
  error?: string;
};

type SupabaseOpportunityRow = {
  opportunity_id: string;
  status: string;
  project_name: string;
  version: number;
};

// ── Preview (GET) ────────────────────────────────────────────────────

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from("opportunities")
      .select("opportunity_id, status, project_name, version")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as SupabaseOpportunityRow[];

    // For each opportunity, show what Stage we'd set in Zoho
    const preview = rows.map((row) => {
      const hasMapping = isValidZohoStage(row.status);
      return {
        opportunityId: row.opportunity_id,
        projectName: row.project_name,
        sirkitoStatus: row.status,
        zohoStage: hasMapping ? mapStatusToZohoStage(row.status) : null,
        version: row.version,
        hasMappingError: !hasMapping,
      };
    });

    return NextResponse.json({ deals: preview, total: preview.length }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to preview deals.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── Bulk Fix (POST) ──────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      confirm?: boolean;
      opportunityIds?: string[];
    };

    if (!body.confirm) {
      return NextResponse.json(
        { error: "Set { confirm: true } to execute the bulk fix." },
        { status: 400 },
      );
    }

    const supabase = createSupabaseServerClient();

    // Fetch all opportunities (or specific ones)
    let query = supabase
      .from("opportunities")
      .select("opportunity_id, status, project_name, version")
      .order("created_at", { ascending: false });

    if (body.opportunityIds && body.opportunityIds.length > 0) {
      query = query.in("opportunity_id", body.opportunityIds);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as SupabaseOpportunityRow[];

    if (rows.length === 0) {
      return NextResponse.json(
        { message: "No opportunities found to fix.", results: [] },
        { status: 200 },
      );
    }

    // Get a single access token for the whole batch
    const { accessToken, apiDomain } = await getZohoAccessToken();
    const results: DealFixResult[] = [];

    for (const row of rows) {
      const result: DealFixResult = {
        opportunityId: row.opportunity_id,
        status: "pending",
      };

      try {
        if (!isValidZohoStage(row.status)) {
          result.status = "skipped";
          result.error = `No Zoho stage mapping for status "${row.status}".`;
          results.push(result);
          continue;
        }

        const newStage = mapStatusToZohoStage(row.status);

        // Step 1: Search for the deal in Zoho by Custom_Opportunity_ID
        const searchUrl = `${apiDomain}/crm/v2/Deals/search?criteria=(Custom_Opportunity_ID:equals:${encodeURIComponent(row.opportunity_id)})`;
        const searchRes = await fetch(searchUrl, {
          headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
          cache: "no-store",
        });

        if (searchRes.status === 204) {
          // No records found — Zoho returns 204 for empty search results
          result.status = "not_found";
          result.error = "Deal not found in Zoho CRM (no matching Custom_Opportunity_ID).";
          results.push(result);
          continue;
        }

        if (!searchRes.ok) {
          const text = await searchRes.text();
          result.status = "error";
          result.error = `Zoho search failed (HTTP ${searchRes.status}): ${text.slice(0, 300)}`;
          results.push(result);
          continue;
        }

        const searchBody = (await searchRes.json()) as {
          data?: { id: string; Stage?: string }[];
        };

        const zohoDeal = searchBody.data?.[0];
        if (!zohoDeal) {
          result.status = "not_found";
          result.error = "Deal not found in Zoho CRM search results.";
          results.push(result);
          continue;
        }

        result.zohoRecordId = zohoDeal.id;
        result.previousStage = zohoDeal.Stage ?? "unknown";
        result.newStage = newStage;

        // Step 2: Update the deal's Stage via PUT
        const updateRes = await fetch(`${apiDomain}/crm/v2/Deals/${zohoDeal.id}`, {
          method: "PUT",
          headers: {
            Authorization: `Zoho-oauthtoken ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            data: [
              {
                Stage: newStage,
                Revision: `V${row.version}`,
              },
            ],
          }),
          cache: "no-store",
        });

        const updateRaw = await updateRes.text();
        let updateBody: { data?: { status?: string; code?: string; message?: string }[] };
        try {
          updateBody = JSON.parse(updateRaw);
        } catch {
          result.status = "error";
          result.error = `Zoho update returned non-JSON: ${updateRaw.slice(0, 300)}`;
          results.push(result);
          continue;
        }

        const updateRecord = updateBody.data?.[0];
        if (updateRecord?.status === "success") {
          result.status = "fixed";
        } else {
          result.status = "error";
          result.error = `Zoho update failed: [${updateRecord?.code ?? "UNKNOWN"}] ${updateRecord?.message ?? "Unknown error"}`;
        }
      } catch (err) {
        result.status = "error";
        result.error = err instanceof Error ? err.message : "Unknown error";
      }

      results.push(result);

      // Respect Zoho API rate limits: ~100ms between requests
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const fixed = results.filter((r) => r.status === "fixed").length;
    const errors = results.filter((r) => r.status === "error").length;
    const notFound = results.filter((r) => r.status === "not_found").length;
    const skipped = results.filter((r) => r.status === "skipped").length;

    return NextResponse.json(
      {
        summary: { total: results.length, fixed, errors, notFound, skipped },
        results,
      },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bulk fix failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
