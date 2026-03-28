"use client";

import * as React from "react";
import { ConfirmModal } from "./ConfirmModal";
import { SirkitoButton } from "./SirkitoButton";
import { ToastProvider, useToast } from "./ToastProvider";
import type { Opportunity } from "@/lib/opportunityTypes";
import {
  getLatestVersion,
} from "@/lib/opportunityDomain";
import { getNextSequenceFromOpportunities } from "@/lib/opportunityRepositoryLocal";
import type { IdConfig } from "@/lib/idConfigStorage";
import {
  opportunityBaseId,
  opportunityFullId,
  yearPrefix,
} from "@/lib/idGenerators";
import { parseBaseCode } from "@/lib/opportunityIdSequence";
import { formatMoney } from "@/lib/opportunityValidation";
import { OpportunityCreateModal } from "./OpportunityCreateModal";
import { OpportunityEditModal, type OpportunityEditValues } from "./OpportunityEditModal";

async function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function OpportunityManagementInner({ idConfig }: { idConfig: IdConfig }) {
  const { showToast } = useToast();

  const [opps, setOpps] = React.useState<Opportunity[]>([]);
  const [isCreating, setIsCreating] = React.useState(false);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [opportunityToRevise, setOpportunityToRevise] = React.useState<Opportunity | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editSnapshot, setEditSnapshot] = React.useState<ReturnType<typeof getLatestVersion> | null>(null);

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("All");
  const [versionFilter, setVersionFilter] = React.useState<string>("All");

  const [nextPreviewFromApi, setNextPreviewFromApi] = React.useState<{
    nextFullId: string;
    nextSequence: number;
    nextBaseCode: string;
  } | null>(null);
  const [nextPreviewLoading, setNextPreviewLoading] = React.useState(false);

  const refreshNextIdPreview = React.useCallback(async () => {
    setNextPreviewLoading(true);
    try {
      const qs = new URLSearchParams();
      if (idConfig.yearPrefixMode !== "AUTO") {
        qs.set("yearPrefix", idConfig.yearPrefixMode);
      }
      qs.set("sequenceStart", String(idConfig.sequenceStart));

      const response = await fetch(`/api/opportunities/next-preview?${qs.toString()}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        nextFullId?: string;
        nextSequence?: number;
        nextBaseCode?: string;
        error?: string;
      };
      if (
        response.ok &&
        typeof data.nextFullId === "string" &&
        typeof data.nextSequence === "number" &&
        typeof data.nextBaseCode === "string"
      ) {
        setNextPreviewFromApi({
          nextFullId: data.nextFullId,
          nextSequence: data.nextSequence,
          nextBaseCode: data.nextBaseCode,
        });
      } else {
        setNextPreviewFromApi(null);
      }
    } catch {
      setNextPreviewFromApi(null);
    } finally {
      setNextPreviewLoading(false);
    }
  }, [idConfig.sequenceStart, idConfig.yearPrefixMode]);

  const loadOpportunitiesList = React.useCallback(async () => {
    try {
      const response = await fetch("/api/opportunities", {
        method: "GET",
        cache: "no-store",
      });
      const data = (await response.json()) as { opportunities?: Opportunity[]; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load opportunities.");
      }

      setOpps((data.opportunities ?? []).sort((a, b) => b.updatedAt - a.updatedAt));
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to load opportunities");
    }
  }, [showToast]);

  const loadOpportunities = React.useCallback(async () => {
    await loadOpportunitiesList();
    await refreshNextIdPreview();
  }, [loadOpportunitiesList, refreshNextIdPreview]);

  React.useEffect(() => {
    void loadOpportunities();
  }, [loadOpportunities]);

  // When opening the modal: fetch next ID immediately (loading state), then sync list and refresh preview again.
  React.useEffect(() => {
    if (!createOpen) return;
    void refreshNextIdPreview();
    void loadOpportunitiesList().then(() => refreshNextIdPreview());
  }, [createOpen, loadOpportunitiesList, refreshNextIdPreview]);

  const latestOpportunity = opps[0] ?? null;

  const fallbackNextSequence =
    opps.length === 0 ? idConfig.sequenceStart : getNextSequenceFromOpportunities(opps);
  const fallbackPrefix =
    idConfig.yearPrefixMode === "AUTO"
      ? latestOpportunity?.prefix ?? yearPrefix()
      : idConfig.yearPrefixMode;
  const fallbackCategoryCode = latestOpportunity?.categoryCode ?? "X";

  const fallbackBaseId = opportunityBaseId(fallbackNextSequence, {
    prefix: fallbackPrefix,
    categoryCode: fallbackCategoryCode,
  });
  const fallbackFullIdPreview = opportunityFullId(fallbackBaseId, 1);
  const fallbackSequencePadded = fallbackNextSequence.toString().padStart(4, "0");
  const fallbackSequenceLabel = `${fallbackCategoryCode}${fallbackSequencePadded}`;

  const nextFullIdPreview =
    nextPreviewFromApi?.nextFullId ?? fallbackFullIdPreview;

  const nextCategoryCodeForLabel = (() => {
    if (nextPreviewFromApi?.nextFullId) {
      const baseCode = nextPreviewFromApi.nextFullId.replace(/-V\d+$/, "");
      const parsed = parseBaseCode(baseCode);
      return parsed?.categoryCode ?? fallbackCategoryCode;
    }
    return fallbackCategoryCode;
  })();

  const nextSequenceLabel = nextPreviewFromApi
    ? `${nextCategoryCodeForLabel}${nextPreviewFromApi.nextSequence.toString().padStart(4, "0")}`
    : fallbackSequenceLabel;

  const statuses = React.useMemo(() => {
    const set = new Set<string>();
    for (const o of opps) set.add(getLatestVersion(o).status);
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [opps]);

  const versions = React.useMemo(() => {
    const set = new Set<number>();
    for (const o of opps) set.add(getLatestVersion(o).version);
    return ["All", ...Array.from(set).sort((a, b) => a - b).map((n) => String(n))];
  }, [opps]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const versionNum = versionFilter !== "All" ? Number(versionFilter) : null;
    const byStatus = statusFilter !== "All" ? statusFilter : null;

    return opps
      .filter((o) => {
        const latest = getLatestVersion(o);
        const fullId = latest.fullId.toLowerCase();
        const project = latest.projectName.toLowerCase();

        if (q) {
          if (!fullId.includes(q) && !project.includes(q)) return false;
        }
        if (byStatus && latest.status !== byStatus) return false;
        if (versionNum !== null && latest.version !== versionNum) return false;
        return true;
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [opps, search, statusFilter, versionFilter]);

  function openReviseModal(opportunity: Opportunity) {
    setOpportunityToRevise(opportunity);
    setConfirmOpen(true);
  }

  function openEditModal(snapshot: ReturnType<typeof getLatestVersion>) {
    setEditSnapshot(snapshot);
    setEditOpen(true);
  }

  async function handleConfirmRevise() {
    if (!opportunityToRevise) return;
    const latest = getLatestVersion(opportunityToRevise);
    try {
      const response = await fetch("/api/opportunities/revise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId: latest.fullId }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        snapshot?: ReturnType<typeof getLatestVersion>;
        zohoSynced?: boolean;
        zohoError?: string | null;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to revise.");
      }

      setConfirmOpen(false);
      setOpportunityToRevise(null);
      await loadOpportunities();

      if (data.snapshot) {
        setEditSnapshot(data.snapshot);
        setEditOpen(true);
      }

      if (data.zohoSynced) {
        showToast("Revision created and synced to Zoho.");
      } else {
        showToast(
          data.zohoError
            ? `Revision saved. Zoho sync failed: ${data.zohoError}`
            : "Revision saved. Zoho sync failed or skipped.",
          4500,
        );
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to revise opportunity.");
    }
  }

  async function handleCopy(fullId: string) {
    try {
      await copyTextToClipboard(fullId);
      showToast("Copied to clipboard");
    } catch {
      showToast("Copy failed");
    }
  }

  const revisionPreview =
    opportunityToRevise && opportunityToRevise.versions.length > 0
      ? {
          current: opportunityToRevise.versions[opportunityToRevise.versions.length - 1].version,
          next: getLatestVersion(opportunityToRevise).version + 1,
          nextFullId: opportunityFullId(
            opportunityToRevise.baseId,
            getLatestVersion(opportunityToRevise).version + 1,
          ),
        }
      : null;

  return (
    <div className="max-w-6xl">
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-[#4B5563] mb-2">
              Search
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by project name or Opportunity ID..."
              className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-[#1A1A1A] shadow-sm placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-sirkito-blue/30 focus:border-sirkito-blue/60"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:w-[420px]">
            <div>
              <label className="block text-xs font-medium text-[#4B5563] mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-[#1A1A1A] shadow-sm outline-none focus:ring-2 focus:ring-sirkito-blue/30 focus:border-sirkito-blue/60"
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#4B5563] mb-2">
                Version
              </label>
              <select
                value={versionFilter}
                onChange={(e) => setVersionFilter(e.target.value)}
                className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-[#1A1A1A] shadow-sm outline-none focus:ring-2 focus:ring-sirkito-blue/30 focus:border-sirkito-blue/60"
              >
                {versions.map((v) => (
                  <option key={v} value={v}>
                    {v === "All" ? "All Versions" : `V${v}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-end justify-between gap-4 w-full lg:w-auto">
            <div className="hidden sm:block">
              <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-medium text-[#4B5563]">
                    Next available sequence
                  </div>
                  <div className="inline-flex items-center rounded-full bg-sky-100 px-2 py-1 text-[11px] font-semibold text-sky-800">
                    Suggested
                  </div>
                </div>
                <div className="mt-2 font-mono text-base font-bold text-[#1A1A1A]">
                  {nextSequenceLabel}
                </div>
                <div className="mt-1 text-xs text-[#4B5563]">
                  Preview:{" "}
                  <span className="font-mono text-[#1A1A1A]">{nextFullIdPreview}</span>
                </div>
              </div>
            </div>

            <SirkitoButton
              onClick={() => setCreateOpen(true)}
              className="!px-4 hover:bg-sirkito-blue/90 hover:text-white focus:ring-sirkito-blue/30"
            >
              Add Opportunity
            </SirkitoButton>
          </div>
        </div>
      </div>

      {opps.length === 0 ? (
        <section className="mt-4 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm">
          <div className="p-10 text-center">
            <div className="text-[#1A1A1A] font-bold">No opportunities yet</div>
            <div className="mt-2 text-sm text-[#4B5563]">
              Click <span className="font-semibold">Add Opportunity</span> to create the first versioned record.
            </div>
            <div className="mt-6 flex justify-center">
              <SirkitoButton
                onClick={() => setCreateOpen(true)}
                className="!px-5 hover:bg-sirkito-blue/90 focus:ring-sirkito-blue/30"
              >
                Add Opportunity
              </SirkitoButton>
            </div>
          </div>
        </section>
      ) : (
        <section className="mt-4 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm">
          <div className="p-4 flex items-center justify-between gap-4">
            <h3 className="text-sm font-semibold text-[#1A1A1A]">Opportunity Records</h3>
            <div className="text-xs text-[#4B5563]">Latest revisions first</div>
          </div>

            <div className="px-4 pb-4 overflow-x-auto">
              <div className="max-h-[70vh] overflow-y-auto rounded-xl ring-1 ring-[#E5E7EB] bg-white">
              <table className="min-w-[1250px] w-full divide-y divide-slate-200">
                <thead className="sticky top-0 z-10 bg-[#F9FAFB]">
                  <tr>
                    <th className="text-left text-xs font-semibold text-[#111827] px-4 py-3">Opportunity ID</th>
                    <th className="text-left text-xs font-semibold text-[#111827] px-4 py-3">Project Name</th>
                    <th className="text-left text-xs font-semibold text-[#111827] px-4 py-3">Location</th>
                    <th className="text-left text-xs font-semibold text-[#111827] px-4 py-3">Client</th>
                    <th className="text-left text-xs font-semibold text-[#111827] px-4 py-3">Contact Person</th>
                    <th className="text-left text-xs font-semibold text-[#111827] px-4 py-3">Contact</th>
                    <th className="text-left text-xs font-semibold text-[#111827] px-4 py-3">Description</th>
                    <th className="text-left text-xs font-semibold text-[#111827] px-4 py-3">VAT</th>
                    <th className="text-left text-xs font-semibold text-[#111827] px-4 py-3">Estimated Amount</th>
                    <th className="text-left text-xs font-semibold text-[#111827] px-4 py-3">Submitted Amount</th>
                    <th className="text-left text-xs font-semibold text-[#111827] px-4 py-3">Date Started</th>
                    <th className="text-left text-xs font-semibold text-[#111827] px-4 py-3">Date Ended</th>
                    <th className="text-left text-xs font-semibold text-[#111827] px-4 py-3">Final Amount (after discount)</th>
                    <th className="text-left text-xs font-semibold text-[#111827] px-4 py-3">Version</th>
                    <th className="text-left text-xs font-semibold text-[#111827] px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="px-4 py-8 text-center text-sm text-[#4B5563]">
                        No results match your filters.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((o, idx) => {
                      const current = getLatestVersion(o);
                      return (
                        <tr
                          key={o.baseId}
                          className={[
                            idx % 2 === 0 ? "bg-white" : "bg-slate-50",
                            "transition-colors hover:bg-sky-50/70",
                          ].join(" ")}
                        >
                          <td className="px-4 py-5">
                            <button
                              type="button"
                              onClick={() => handleCopy(current.fullId)}
                              className="font-mono text-sm font-semibold text-sirkito-blue hover:text-sirkito-blue/90 transition-colors focus:outline-none focus:ring-2 focus:ring-sirkito-blue/30 rounded-lg px-2 py-1 text-left"
                              title="Click to copy full ID"
                            >
                              {current.fullId}
                            </button>
                          </td>
                          <td className="px-4 py-5">
                            <div className="text-sm font-semibold text-[#1A1A1A]">{current.projectName}</div>
                          </td>
                          <td className="px-4 py-5">
                            <div className="text-sm text-[#1A1A1A]">{current.location}</div>
                          </td>
                          <td className="px-4 py-5">
                            <div className="text-sm text-[#1A1A1A]">{current.client}</div>
                          </td>
                          <td className="px-4 py-5">
                            <div className="text-sm text-[#1A1A1A]">{current.contactPerson}</div>
                          </td>
                          <td className="px-4 py-5">
                            <div className="text-sm text-[#1A1A1A] font-mono">{current.contact}</div>
                          </td>
                          <td className="px-4 py-5">
                            <div className="text-sm text-[#374151] line-clamp-2 max-w-[260px]">
                              {current.description}
                            </div>
                          </td>
                          <td className="px-4 py-5">
                            <div className="inline-flex items-center rounded-lg bg-[#F3F4F6] px-3 py-1 text-xs font-semibold text-[#374151]">
                              {current.vat}
                            </div>
                          </td>
                          <td className="px-4 py-5 font-mono text-sm font-semibold text-[#1A1A1A]">
                            {formatMoney(current.estimatedAmount)}
                          </td>
                          <td className="px-4 py-5 font-mono text-sm font-semibold text-[#1A1A1A]">
                            {formatMoney(current.submittedAmount)}
                          </td>
                          <td className="px-4 py-5 text-sm text-[#1A1A1A]">
                            {current.dateStarted ?? "-"}
                          </td>
                          <td className="px-4 py-5 text-sm text-[#1A1A1A]">
                            {current.dateEnded ?? "-"}
                          </td>
                          <td className="px-4 py-5 font-mono text-sm font-semibold text-[#1A1A1A]">
                            {current.finalAmountAfterDiscount === null || current.finalAmountAfterDiscount === undefined
                              ? "-"
                              : formatMoney(current.finalAmountAfterDiscount)}
                          </td>
                          <td className="px-4 py-5 font-mono text-sm font-semibold text-[#1A1A1A]">
                            V{current.version}
                          </td>
                          <td className="px-4 py-5">
                            <div className="flex flex-col gap-2">
                              <div
                                className={[
                                  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border",
                                  current.status === "Bidding"
                                    ? "bg-[#FFEDD5] text-[#C2410C] border-[#FDBA74]"
                                    : current.status === "Awarded"
                                      ? "bg-[#DCFCE7] text-[#166534] border-[#86EFAC]"
                                      : "bg-slate-100 text-slate-700 border-slate-200",
                                ].join(" ")}
                              >
                                {current.status}
                              </div>
                              <SirkitoButton
                                variant="secondary"
                                onClick={() => openReviseModal(o)}
                                className="!px-3 hover:bg-sirkito-blue/5 hover:border-sirkito-blue/40 focus:ring-sirkito-blue/30"
                              >
                                Revise
                              </SirkitoButton>
                              <SirkitoButton
                                variant="secondary"
                                onClick={() => openEditModal(current)}
                                className="!px-3 hover:bg-sirkito-blue/5 hover:border-sirkito-blue/40 focus:ring-sirkito-blue/30"
                              >
                                Edit
                              </SirkitoButton>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <OpportunityCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        nextFullIdPreview={nextFullIdPreview}
        nextPreviewLoading={createOpen && nextPreviewLoading}
        isSubmitting={isCreating}
        idConfig={idConfig}
        onSubmit={async (values) => {
          setIsCreating(true);
          try {
            const response = await fetch("/api/opportunities", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                ...values,
                yearPrefixOverride:
                  idConfig.yearPrefixMode === "AUTO" ? null : idConfig.yearPrefixMode,
                sequenceStart: idConfig.sequenceStart,
              }),
            });

            const rawText = await response.text();
            let parsed: Record<string, unknown>;
            try {
              parsed = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};
            } catch (error) {
              console.log("Supabase Error:", error);
              return {
                ok: false,
                error: "Invalid response from server. Check the Network tab for details.",
              };
            }

            const result = parsed as {
              opportunity?: Opportunity;
              zohoSynced?: boolean;
              error?: string;
              code?: string;
              details?: string;
              hint?: string;
              conflictCode?: string;
              suggestedNextFullId?: string;
            };

            if (!response.ok) {
              const error = {
                status: response.status,
                message: result.error,
                code: result.code,
                details: result.details,
                hint: result.hint,
                body: parsed,
              };
              console.log("Supabase Error:", error);

              if (response.status === 409) {
                const conflictMsg =
                  result.error ??
                  "This Opportunity ID already exists. Please use a different sequence or increment the version.";
                showToast(conflictMsg, 5000);
                void loadOpportunities();
                const hint =
                  typeof result.suggestedNextFullId === "string"
                    ? ` Next available ID: ${result.suggestedNextFullId}`
                    : "";
                return { ok: false, error: `${conflictMsg}${hint}` };
              }

              return {
                ok: false,
                error:
                  result.error ??
                  (typeof result.details === "string" ? result.details : null) ??
                  "Unable to save opportunity.",
              };
            }

            // Close + toast immediately so the UI never depends on list refresh.
            setCreateOpen(false);
            if (result.zohoSynced) {
              showToast("Project Saved & Synced to Zoho!");
            } else {
              showToast("Project saved to Sirkito DB. Zoho sync failed.");
            }

            if (result.opportunity) {
              setOpps((prev) =>
                [result.opportunity as Opportunity, ...prev].sort((a, b) => b.updatedAt - a.updatedAt),
              );
            }
            void loadOpportunities();

            return { ok: true };
          } catch (error) {
            console.log("Supabase Error:", error);
            return {
              ok: false,
              error: error instanceof Error ? error.message : "Unable to save opportunity.",
            };
          } finally {
            setIsCreating(false);
          }
        }}
      />

      <OpportunityEditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        opportunity={editSnapshot}
        onSave={async (values: OpportunityEditValues) => {
          if (!editSnapshot) return { ok: false, error: "No opportunity selected." };
          const response = await fetch("/api/opportunities/edit", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              opportunityId: editSnapshot.fullId,
              projectName: values.projectName,
              location: values.location,
              client: values.client,
              contactPerson: values.contactPerson,
              contact: values.contact,
              description: values.description,
              vat: values.vat,
              estimatedAmount: values.estimatedAmount,
              submittedAmount: values.submittedAmount,
              status: values.status,
              dateStarted: values.dateStarted,
              dateEnded: values.dateEnded,
              finalAmountAfterDiscount: values.finalAmountAfterDiscount,
            }),
          });

          const data = (await response.json().catch(() => ({}))) as {
            error?: string;
            ok?: boolean;
            zohoSynced?: boolean;
            zohoError?: string | null;
          };
          if (!response.ok) {
            return { ok: false, error: data.error ?? "Unable to save changes." };
          }

          setEditOpen(false);
          if (data.zohoSynced) {
            showToast("Opportunity updated and synced to Zoho.");
          } else {
            showToast(
              data.zohoError
                ? `Saved to Sirkito. Zoho sync failed: ${data.zohoError}`
                : "Saved to Sirkito. Zoho sync failed or skipped.",
              4500,
            );
          }
          void loadOpportunities();
          return { ok: true };
        }}
      />

      <ConfirmModal
        open={confirmOpen}
        title="Create a new revision?"
        description={
          revisionPreview
            ? `This will increment ${opportunityToRevise?.baseId} from V${revisionPreview.current} to V${revisionPreview.next}.`
            : undefined
        }
        confirmLabel="Create Revision"
        cancelLabel="Cancel"
        onCancel={() => {
          setConfirmOpen(false);
          setOpportunityToRevise(null);
        }}
        onConfirm={handleConfirmRevise}
      />
    </div>
  );
}

export function OpportunityManagementSystem({ idConfig }: { idConfig: IdConfig }) {
  return (
    <ToastProvider>
      <OpportunityManagementInner idConfig={idConfig} />
    </ToastProvider>
  );
}

