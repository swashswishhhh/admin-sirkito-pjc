import { NextResponse } from "next/server";
import { tryRefreshZohoAccessToken } from "@/lib/zohoOAuth";

export async function GET() {
  try {
    const result = await tryRefreshZohoAccessToken();
    if (result.ok) {
      return NextResponse.json(
        {
          connected: true,
          status: "connected",
          message: "Zoho refresh token is valid.",
          apiDomain: result.apiDomain,
          checkedAt: new Date().toISOString(),
        },
        { status: 200 },
      );
    }

    const detail = result.errorDescription ?? result.error ?? "Zoho refresh failed.";
    const status =
      result.error === "invalid_code" || detail.toLowerCase().includes("revok")
        ? "invalid-refresh-token"
        : "not-connected";

    return NextResponse.json(
      {
        connected: false,
        status,
        message: detail,
        checkedAt: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to check Zoho connection.";
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

