export type ZohoOAuthEnv = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accountsUrl: string;
};

function readZohoOAuthEnvOrThrow(): ZohoOAuthEnv {
  const clientId = process.env.ZOHO_CLIENT_ID?.trim();
  const clientSecret = process.env.ZOHO_CLIENT_SECRET?.trim();
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN?.trim();
  const accountsUrl = process.env.ZOHO_ACCOUNTS_URL?.trim() || "https://accounts.zoho.com";

  if (!clientId || !clientSecret || !refreshToken) {
    const missing: string[] = [];
    if (!clientId) missing.push("ZOHO_CLIENT_ID");
    if (!clientSecret) missing.push("ZOHO_CLIENT_SECRET");
    if (!refreshToken) missing.push("ZOHO_REFRESH_TOKEN");
    throw new Error(
      `Missing Zoho configuration: ${missing.join(", ")}. Set these in Vercel Environment Variables and redeploy.`,
    );
  }

  return {
    clientId,
    clientSecret,
    refreshToken,
    accountsUrl,
  };
}

type ZohoTokenJson = {
  access_token?: string;
  api_domain?: string;
  error?: string;
  error_description?: string;
};

/**
 * Attempts a Zoho OAuth refresh-token flow.
 * Returns whether refresh succeeded + resolved api_domain (datacenter).
 */
export async function tryRefreshZohoAccessToken(): Promise<{
  ok: boolean;
  apiDomain?: string;
  error?: string;
  errorDescription?: string;
}> {
  const { clientId, clientSecret, refreshToken, accountsUrl } = readZohoOAuthEnvOrThrow();

  const tokenUrl = `${accountsUrl}/oauth/v2/token`;
  const body = new URLSearchParams();
  body.set("grant_type", "refresh_token");
  body.set("refresh_token", refreshToken);
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  const raw = await response.text();
  let json: ZohoTokenJson = {};
  try {
    json = JSON.parse(raw) as ZohoTokenJson;
  } catch {
    return {
      ok: false,
      error: "Zoho token endpoint returned non-JSON response.",
      errorDescription: raw.slice(0, 500),
    };
  }

  if (response.ok && json.access_token) {
    return {
      ok: true,
      apiDomain: json.api_domain?.trim() || process.env.ZOHO_API_DOMAIN?.trim() || "https://www.zohoapis.com",
    };
  }

  return {
    ok: false,
    error: json.error ?? "Unable to retrieve Zoho access token.",
    errorDescription: json.error_description?.trim() || undefined,
  };
}

