import { getZohoAccessTokenOrThrow } from "@/lib/zohoOAuth";

export type ZohoDealFields = {
  Deal_Name: string;
  Account_Name: string;
  Description: string;
  Amount: number;
  Custom_Opportunity_ID: string;
};

function authHeaders(accessToken: string) {
  return {
    Authorization: `Zoho-oauthtoken ${accessToken}`,
    "Content-Type": "application/json",
  };
}

export async function zohoCreateDeal(
  apiDomain: string,
  accessToken: string,
  fields: ZohoDealFields,
): Promise<void> {
  const payload = { data: [fields] };
  const response = await fetch(`${apiDomain}/crm/v2/Deals`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Zoho Deals create failed: ${text}`);
  }
}

/** Returns Zoho internal Deal id, or null if not found. */
export async function zohoFindDealIdByCustomOpportunityId(
  apiDomain: string,
  accessToken: string,
  customOpportunityId: string,
): Promise<string | null> {
  const criteria = `(Custom_Opportunity_ID:equals:${customOpportunityId})`;
  const url = `${apiDomain}/crm/v2/Deals/search?criteria=${encodeURIComponent(criteria)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) {
    return null;
  }
  const json = (await response.json()) as { data?: Array<{ id?: string }> };
  const id = json.data?.[0]?.id;
  return typeof id === "string" ? id : null;
}

export async function zohoUpdateDeal(
  apiDomain: string,
  accessToken: string,
  dealId: string,
  fields: ZohoDealFields,
): Promise<void> {
  const payload = {
    data: [
      {
        id: dealId,
        ...fields,
      },
    ],
  };
  const response = await fetch(`${apiDomain}/crm/v2/Deals`, {
    method: "PUT",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Zoho Deals update failed: ${text}`);
  }
}

/** Create a Deal in Zoho CRM (used on new opportunity insert). */
export async function syncZohoDealCreate(input: {
  opportunityId: string;
  projectName: string;
  client: string;
  location: string;
  description: string;
  submittedAmount: number;
}) {
  const { accessToken, apiDomain } = await getZohoAccessTokenOrThrow();
  const amount = Number(input.submittedAmount);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  await zohoCreateDeal(apiDomain, accessToken, {
    Deal_Name: input.projectName,
    Account_Name: input.client,
    Description: `${input.description}\nLocation: ${input.location}`,
    Amount: safeAmount,
    Custom_Opportunity_ID: input.opportunityId,
  });
}

/**
 * Update an existing Deal located by prior Custom_Opportunity_ID, or create if missing.
 */
export async function syncZohoDealUpsertByCustomId(input: {
  /** Value previously stored in Zoho Custom_Opportunity_ID (e.g. before an edit/revision renames it). */
  lookupCustomOpportunityId: string;
  fields: ZohoDealFields;
}) {
  const { accessToken, apiDomain } = await getZohoAccessTokenOrThrow();
  const dealId = await zohoFindDealIdByCustomOpportunityId(
    apiDomain,
    accessToken,
    input.lookupCustomOpportunityId,
  );
  if (dealId) {
    await zohoUpdateDeal(apiDomain, accessToken, dealId, input.fields);
  } else {
    await zohoCreateDeal(apiDomain, accessToken, input.fields);
  }
}
