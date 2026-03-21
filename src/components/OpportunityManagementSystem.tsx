"use client";

import * as React from "react";
import { ConfirmModal } from "./ConfirmModal";
import { SirkitoButton } from "./SirkitoButton";
import { ToastProvider, useToast } from "./ToastProvider";
import type { Opportunity } from "@/lib/opportunityTypes";
import {
  createOpportunityDomain,
  getLatestVersion,
  reviseOpportunityDomain,
} from "@/lib/opportunityDomain";
import {
  createLocalOpportunityRepository,
  getNextSequenceFromOpportunities,
} from "@/lib/opportunityRepositoryLocal";
import {
  opportunityBaseId,
  opportunityFullId,
} from "@/lib/idGenerators";
import { formatMoney } from "@/lib/opportunityValidation";
import { OpportunityCreateModal } from "./OpportunityCreateModal";

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

const PREFIX = "Q26";
const CATEGORY_LETTER = "E";

function OpportunityManagementInner() {
  const { showToast } = useToast();
  const repo = React.useMemo(() => createLocalOpportunityRepository(), []);

  const [opps, setOpps] = React.useState<Opportunity[]>([]);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [opportunityToRevise, setOpportunityToRevise] = React.useState<Opportunity | null>(null);

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("All");
  const [versionFilter, setVersionFilter] = React.useState<string>("All");

  React.useEffect(() => {
    setOpps(repo.getAll().sort((a, b) => b.updatedAt - a.updatedAt));
  }, [repo]);

  const nextSequence = getNextSequenceFromOpportunities(opps);
  const nextBaseId = opportunityBaseId(nextSequence, {
    prefix: PREFIX,
    categoryLetter: CATEGORY_LETTER,
  });
  const nextFullIdPreview = opportunityFullId(nextBaseId, 1);
  const nextSequencePadded = nextSequence.toString().padStart(4, "0");
  const nextSequenceLabel = `${CATEGORY_LETTER}${nextSequencePadded}`;

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

  function handleConfirmRevise() {
    if (!opportunityToRevise) return;
    const revised = reviseOpportunityDomain(opportunityToRevise);
    const next = opps.map((o) => (o.baseId === revised.baseId ? revised : o));
    repo.saveAll(next);
    setOpps(next.sort((a, b) => b.updatedAt - a.updatedAt));

    setConfirmOpen(false);
    setOpportunityToRevise(null);
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
            <div className="hidden sm:block text-right">
              <div className="text-xs font-medium text-[#4B5563]">
                Next available sequence
              </div>
              <div className="mt-1 font-mono text-base font-bold text-[#1A1A1A]">
                {nextSequenceLabel}
              </div>
              <div className="mt-1 text-xs text-[#4B5563]">
                Preview: <span className="font-mono text-[#1A1A1A]">{nextFullIdPreview}</span>
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
            <div className="max-h-[70vh] overflow-y-auto border border-[#E5E7EB] rounded-xl">
              <table className="min-w-[1250px] w-full divide-y divide-[#E5E7EB]">
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
                    <th className="text-left text-xs font-semibold text-[#111827] px-4 py-3">Version</th>
                    <th className="text-left text-xs font-semibold text-[#111827] px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-4 py-8 text-center text-sm text-[#4B5563]">
                        No results match your filters.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((o, idx) => {
                      const current = getLatestVersion(o);
                      return (
                        <tr
                          key={o.baseId}
                          className={idx % 2 === 0 ? "bg-white" : "bg-[#F9FAFB]"}
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
                          <td className="px-4 py-5 font-mono text-sm font-semibold text-[#1A1A1A]">
                            V{current.version}
                          </td>
                          <td className="px-4 py-5">
                            <div className="flex flex-col gap-2">
                              <div
                                className={[
                                  "inline-flex items-center rounded-lg px-3 py-1 text-xs font-semibold",
                                  current.status === "Submitted"
                                    ? "bg-[#F3F4F6] text-[#374151]"
                                    : current.status === "Revised"
                                      ? "bg-[#DBEAFE] text-[#1D4ED8]"
                                      : "bg-[#F3F4F6] text-[#374151]",
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
        onSubmit={(values) => {
          const created = createOpportunityDomain({
            ...values,
            sequence: nextSequence,
            prefix: PREFIX,
            categoryLetter: CATEGORY_LETTER,
          });
          const next = [created, ...opps].sort((a, b) => b.updatedAt - a.updatedAt);
          repo.saveAll(next);
          setOpps(next);
          setCreateOpen(false);
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

export function OpportunityManagementSystem() {
  return (
    <ToastProvider>
      <OpportunityManagementInner />
    </ToastProvider>
  );
}

