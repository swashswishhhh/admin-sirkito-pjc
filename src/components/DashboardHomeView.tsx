"use client";

import * as React from "react";
import type { Opportunity } from "@/lib/opportunityTypes";
import { getLatestVersion } from "@/lib/opportunityDomain";
import { formatMoney } from "@/lib/opportunityValidation";
import { Card, CardContent } from "./ui/card";

type Props = Record<string, never>;

function monthKey(epochMs: number) {
  const d = new Date(epochMs);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

function monthLabelFromKey(key: string) {
  const [y, mm] = key.split("-");
  const monthIndex = Math.max(1, Math.min(12, Number(mm))) - 1;
  const monthName = new Date(Number(y), monthIndex, 1).toLocaleString("en-US", { month: "short" });
  return `${monthName}`;
}

function DonutChart({
  bidding,
  awarded,
}: {
  bidding: number;
  awarded: number;
}) {
  const total = Math.max(1, bidding + awarded);
  const biddingPct = bidding / total;
  const awardedPct = awarded / total;

  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const biddingLen = circumference * biddingPct;
  const awardedLen = circumference * awardedPct;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-6">
      <div className="relative h-[100px] w-[100px] sm:h-[120px] sm:w-[120px]">
        <svg width="100%" height="100%" viewBox="0 0 120 120" className="block">
          <g transform="rotate(-90 60 60)">
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="transparent"
              stroke="#E5E7EB"
              strokeWidth="14"
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="transparent"
              stroke="#F97316"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${biddingLen} ${circumference - biddingLen}`}
              strokeDashoffset="0"
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="transparent"
              stroke="#22C55E"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${awardedLen} ${circumference - awardedLen}`}
              strokeDashoffset={-biddingLen}
            />
          </g>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-xs font-semibold text-slate-500">Total</div>
            <div className="text-xl font-bold text-slate-900">{total}</div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
          <div className="text-sm text-slate-700">Bidding</div>
          <div className="ml-auto text-sm font-semibold text-slate-900">{bidding}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <div className="text-sm text-slate-700">Awarded</div>
          <div className="ml-auto text-sm font-semibold text-slate-900">{awarded}</div>
        </div>
      </div>
    </div>
  );
}

function BarChart({
  data,
}: {
  data: Array<{ key: string; label: string; value: number }>;
}) {
  const maxVal = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="w-full">
      <div className="flex items-end gap-3 h-[180px]">
        {data.map((d) => {
          const heightPct = (d.value / maxVal) * 100;
          return (
            <div key={d.key} className="flex-1 flex flex-col items-center gap-2">
              <div
                className="w-full rounded-xl bg-sirkito-blue/20 border border-sirkito-blue/25"
                style={{ height: `${Math.max(3, heightPct)}%` }}
                aria-label={`${d.label}: ${d.value}`}
              />
              <div className="text-[11px] font-semibold text-slate-500">{d.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DashboardHomeView({}: Props) {
  const [opps, setOpps] = React.useState<Opportunity[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/opportunities", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setOpps(((data?.opportunities ?? []) as Opportunity[]).sort((a, b) => b.updatedAt - a.updatedAt));
      })
      .catch(() => {
        if (!cancelled) setOpps([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const latestSnapshots = React.useMemo(() => opps.map((o) => getLatestVersion(o)), [opps]);
  const totalOpportunities = latestSnapshots.length;
  const activeBids = latestSnapshots.filter((s) => s.status === "Bidding").length;
  const awardedProjects = latestSnapshots.filter((s) => s.status === "Awarded").length;
  const totalEstimatedAmount = latestSnapshots.reduce((acc, s) => acc + (s.estimatedAmount ?? 0), 0);

  const perMonth = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const s of latestSnapshots) {
      const key = monthKey(s.createdAt);
      map.set(key, (map.get(key) ?? 0) + 1);
    }

    // Show last 6 months (including current month).
    const now = new Date();
    const buckets: Array<{ key: string; label: string }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets.push({ key, label: monthLabelFromKey(key) });
    }

    return buckets.map((b) => ({
      key: b.key,
      label: b.label,
      value: map.get(b.key) ?? 0,
    }));
  }, [latestSnapshots]);

  return (
    <div className="max-w-6xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-xs font-semibold text-slate-500">Total Opportunities</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{loading ? "—" : totalOpportunities}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-xs font-semibold text-slate-500">Active Bids</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{loading ? "—" : activeBids}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-xs font-semibold text-slate-500">Awarded Projects</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{loading ? "—" : awardedProjects}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-xs font-semibold text-slate-500">Total Estimated Amount</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {loading ? "—" : formatMoney(totalEstimatedAmount)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">Opportunities per Month</div>
                <div className="mt-1 text-xs text-slate-500">Last 6 months</div>
              </div>
              <div className="text-xs text-slate-500">{loading ? "Loading…" : "Auto"}</div>
            </div>
            <div className="mt-4">
              <BarChart data={perMonth} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">Bidding vs. Awarded</div>
                <div className="mt-1 text-xs text-slate-500">Status distribution</div>
              </div>
            </div>

            <div className="mt-4">
              <DonutChart bidding={activeBids} awarded={awardedProjects} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

