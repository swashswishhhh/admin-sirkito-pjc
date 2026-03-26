"use client";

import * as React from "react";
import type { IdConfig, YearPrefixMode } from "@/lib/idConfigStorage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";

type Props = {
  idConfig: IdConfig;
  onIdConfigChange: (next: IdConfig) => void;
};

type ZohoStatusResponse = {
  connected: boolean;
  status: string;
  message: string;
  checkedAt: string;
  apiDomain?: string;
};

export function DashboardSettingsView({ idConfig, onIdConfigChange }: Props) {
  const [zohoStatus, setZohoStatus] = React.useState<ZohoStatusResponse | null>(null);
  const [loadingZoho, setLoadingZoho] = React.useState(false);

  const refreshZohoStatus = React.useCallback(async () => {
    setLoadingZoho(true);
    try {
      const res = await fetch("/api/zoho/connection-status", { method: "GET", cache: "no-store" });
      const data = (await res.json()) as ZohoStatusResponse;
      setZohoStatus(data);
    } catch (e) {
      setZohoStatus({
        connected: false,
        status: "error",
        message: e instanceof Error ? e.message : "Failed to load Zoho status.",
        checkedAt: new Date().toISOString(),
      });
    } finally {
      setLoadingZoho(false);
    }
  }, []);

  React.useEffect(() => {
    void refreshZohoStatus();
  }, [refreshZohoStatus]);

  async function handleRefreshToken() {
    setLoadingZoho(true);
    try {
      const res = await fetch("/api/zoho/refresh-token", { method: "POST" });
      const data = (await res.json()) as ZohoStatusResponse;
      setZohoStatus(data);
    } catch (e) {
      setZohoStatus({
        connected: false,
        status: "error",
        message: e instanceof Error ? e.message : "Zoho refresh failed.",
        checkedAt: new Date().toISOString(),
      });
    } finally {
      setLoadingZoho(false);
    }
  }

  const yearPrefixMode = idConfig.yearPrefixMode;

  function setYearPrefixMode(next: YearPrefixMode) {
    onIdConfigChange({ ...idConfig, yearPrefixMode: next });
  }

  function setSequenceStart(next: number) {
    onIdConfigChange({ ...idConfig, sequenceStart: next });
  }

  const badgeVariant =
    zohoStatus?.connected && zohoStatus.status === "connected"
      ? "success"
      : zohoStatus?.status === "invalid-refresh-token"
        ? "warning"
        : "outline";

  return (
    <div className="max-w-6xl">
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Zoho Integration</CardTitle>
            <CardDescription>Connection status and token health check.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-slate-500">Connection Status</div>
                <div className="mt-2">
                  {zohoStatus ? (
                    <div className="flex items-center gap-3">
                      <Badge variant={badgeVariant}>
                        {zohoStatus.connected ? "Connected" : "Not Connected"}
                      </Badge>
                      <div className="text-sm font-semibold text-slate-700">{zohoStatus.message}</div>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-600">Checking…</div>
                  )}
                </div>
                {zohoStatus?.checkedAt ? (
                  <div className="mt-2 text-xs text-slate-500">
                    Last checked:{" "}
                    {new Date(zohoStatus.checkedAt).toLocaleString("en-US", { hour12: false })}
                  </div>
                ) : null}
              </div>

              <Button
                onClick={handleRefreshToken}
                disabled={loadingZoho}
                variant="default"
                className="whitespace-nowrap"
              >
                {loadingZoho ? "Refreshing…" : "Refresh Token"}
              </Button>
            </div>
            <Separator />
            <div className="text-xs text-slate-500">
              Token refresh happens server-side using your `ZOHO_REFRESH_TOKEN` and OAuth client credentials.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ID Configuration</CardTitle>
            <CardDescription>Control the prefix and default sequence start used for new IDs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="text-sm font-semibold text-slate-900">Year Prefix (Q26/Q27)</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  variant={yearPrefixMode === "Q26" ? "default" : "outline"}
                  onClick={() => setYearPrefixMode("Q26")}
                >
                  Q26
                </Button>
                <Button
                  variant={yearPrefixMode === "Q27" ? "default" : "outline"}
                  onClick={() => setYearPrefixMode("Q27")}
                >
                  Q27
                </Button>
                <Button
                  variant={yearPrefixMode === "AUTO" ? "default" : "outline"}
                  onClick={() => setYearPrefixMode("AUTO")}
                >
                  Auto
                </Button>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-slate-900">Default Sequence Start</div>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <div>
                  <Label htmlFor="sequenceStart">Sequence start number</Label>
                  <Input
                    id="sequenceStart"
                    type="number"
                    min={1}
                    step={1}
                    value={idConfig.sequenceStart}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (!Number.isFinite(n)) return;
                      setSequenceStart(Math.max(1, Math.trunc(n)));
                    }}
                  />
                </div>
                <div className="text-xs text-slate-500">
                  Used only when creating the first record (empty table). Existing rows always increment from their latest sequence.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Profile</CardTitle>
            <CardDescription>Basic admin details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">Sirkito Admin</div>
                <div className="mt-1 text-xs text-slate-500">Role: System Administrator</div>
              </div>
              <Badge variant="default">Admin</Badge>
            </div>
            <Separator />
            <div className="text-xs text-slate-500">
              For security, OAuth credentials are stored server-side. Admin settings here only affect ID generation logic for this UI.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

