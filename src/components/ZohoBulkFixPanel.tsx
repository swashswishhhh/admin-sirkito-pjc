"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";

type DealPreview = {
  opportunityId: string;
  projectName: string;
  sirkitoStatus: string;
  zohoStage: string | null;
  version: number;
  hasMappingError: boolean;
};

type FixResult = {
  opportunityId: string;
  status: string;
  zohoRecordId?: string;
  previousStage?: string;
  newStage?: string;
  error?: string;
};

type FixSummary = {
  total: number;
  fixed: number;
  errors: number;
  notFound: number;
  skipped: number;
};

export function ZohoBulkFixPanel() {
  const [deals, setDeals] = React.useState<DealPreview[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [fixing, setFixing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [results, setResults] = React.useState<FixResult[] | null>(null);
  const [summary, setSummary] = React.useState<FixSummary | null>(null);

  async function loadPreview() {
    setLoading(true);
    setError(null);
    setResults(null);
    setSummary(null);
    try {
      const res = await fetch("/api/zoho/zoho-bulk-fix", { method: "GET", cache: "no-store" });
      const data = (await res.json()) as {
        deals?: DealPreview[];
        error?: string;
      };
      if (!res.ok || data.error) {
        setError(data.error ?? "Failed to load preview.");
        return;
      }
      setDeals(data.deals ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load preview.");
    } finally {
      setLoading(false);
    }
  }

  async function runBulkFix() {
    setFixing(true);
    setError(null);
    setResults(null);
    setSummary(null);
    try {
      const res = await fetch("/api/zoho/zoho-bulk-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const data = (await res.json()) as {
        summary?: FixSummary;
        results?: FixResult[];
        error?: string;
      };
      if (!res.ok || data.error) {
        setError(data.error ?? "Bulk fix failed.");
        return;
      }
      setResults(data.results ?? []);
      setSummary(data.summary ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk fix failed.");
    } finally {
      setFixing(false);
    }
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case "fixed":
        return <Badge variant="success">Fixed</Badge>;
      case "error":
        return <Badge variant="warning">Error</Badge>;
      case "not_found":
        return <Badge variant="warning">Not Found</Badge>;
      case "skipped":
        return <Badge variant="outline">Skipped</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg
            className="h-5 w-5 text-amber-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Zoho Stage Bulk Fix
        </CardTitle>
        <CardDescription>
          Fix deals stuck in &quot;UnAccounted&quot; by updating their Stage to the correct value based on
          their Sirkito status.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <Button onClick={loadPreview} disabled={loading || fixing} variant="outline">
            {loading ? "Loading…" : "Preview Deals"}
          </Button>
          <Button
            onClick={runBulkFix}
            disabled={fixing || loading || deals.length === 0}
            variant="default"
            className="bg-amber-600 hover:bg-amber-700"
          >
            {fixing ? "Fixing…" : "Fix All Deals"}
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Preview table */}
        {deals.length > 0 && !results && (
          <>
            <Separator />
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Preview — {deals.length} deal{deals.length !== 1 ? "s" : ""} found
            </div>
            <div className="max-h-[300px] overflow-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-700">
                      Opportunity ID
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-700">
                      Project
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-700">
                      Status
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-700">
                      → Zoho Stage
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deals.map((d) => (
                    <tr key={d.opportunityId} className="hover:bg-slate-50/60">
                      <td className="px-3 py-2 font-mono text-xs font-semibold">
                        {d.opportunityId}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700 max-w-[200px] truncate">
                        {d.projectName}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={d.sirkitoStatus === "Awarded" ? "success" : "outline"}>
                          {d.sirkitoStatus}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-xs font-semibold">
                        {d.hasMappingError ? (
                          <span className="text-red-600">⚠ No mapping</span>
                        ) : (
                          <span className="text-green-700">{d.zohoStage}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Results */}
        {summary && results && (
          <>
            <Separator />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
                <div className="text-2xl font-bold text-green-700">{summary.fixed}</div>
                <div className="text-xs text-green-600">Fixed</div>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
                <div className="text-2xl font-bold text-red-700">{summary.errors}</div>
                <div className="text-xs text-red-600">Errors</div>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
                <div className="text-2xl font-bold text-amber-700">{summary.notFound}</div>
                <div className="text-xs text-amber-600">Not Found</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
                <div className="text-2xl font-bold text-slate-700">{summary.skipped}</div>
                <div className="text-xs text-slate-600">Skipped</div>
              </div>
            </div>

            <div className="max-h-[300px] overflow-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-700">
                      Opportunity ID
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-700">
                      Status
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-700">
                      Stage Change
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-700">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.map((r) => (
                    <tr key={r.opportunityId} className="hover:bg-slate-50/60">
                      <td className="px-3 py-2 font-mono text-xs font-semibold">
                        {r.opportunityId}
                      </td>
                      <td className="px-3 py-2">{statusBadge(r.status)}</td>
                      <td className="px-3 py-2 text-xs">
                        {r.previousStage && r.newStage ? (
                          <span>
                            <span className="text-red-500 line-through">{r.previousStage}</span>
                            {" → "}
                            <span className="text-green-700 font-semibold">{r.newStage}</span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500 max-w-[200px] truncate">
                        {r.error ?? (r.zohoRecordId ? `Zoho ID: ${r.zohoRecordId}` : "—")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
