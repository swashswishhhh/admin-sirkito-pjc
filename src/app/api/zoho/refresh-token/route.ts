import { NextResponse } from "next/server";
import { tryRefreshZohoAccessToken } from "@/lib/zohoOAuth";

export async function POST() {
  try {
    const result = await tryRefreshZohoAccessToken();
    if (result.ok) {
      return NextResponse.json(
        {
          connected: true,
          status: "connected",
          message: "Zoho refresh token refreshed successfully.",
          apiDomain: result.apiDomain,
          checkedAt: new Date().toISOString(),
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        connected: false,
        status: "not-connected",
        message: result.errorDescription ?? result.error ?? "Zoho refresh failed.",
        checkedAt: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to refresh Zoho connection.";
    return NextResponse.json(
      {
        connected: false,
        status: "missing-env",
        message,
        checkedAt: new Date().toISOString(),
      },
      { status: 200 },
    );
  }
}

