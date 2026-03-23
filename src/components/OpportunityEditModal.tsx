"use client";

import * as React from "react";
import { SirkitoButton } from "./SirkitoButton";
import type { OpportunitySnapshot, OpportunityStatus } from "@/lib/opportunityTypes";
import { parseMoney } from "@/lib/opportunityValidation";

type EditValues = {
  status: OpportunityStatus;
  dateStarted: string | null; // YYYY-MM-DD or null
  dateEnded: string | null; // YYYY-MM-DD or null
  finalAmountAfterDiscount: number;
};

export function OpportunityEditModal({
  open,
  onClose,
  opportunity,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  opportunity: OpportunitySnapshot | null;
  onSave: (values: EditValues) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [values, setValues] = React.useState<EditValues>({
    status: "Bidding",
    dateStarted: null,
    dateEnded: null,
    finalAmountAfterDiscount: 0,
  });
  const [finalAmountInput, setFinalAmountInput] = React.useState("0");
  const [error, setError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (!opportunity) return;
    setValues({
      status: opportunity.status,
      dateStarted: opportunity.dateStarted ?? null,
      dateEnded: opportunity.dateEnded ?? null,
      finalAmountAfterDiscount: opportunity.finalAmountAfterDiscount ?? 0,
    });
    setFinalAmountInput(String(opportunity.finalAmountAfterDiscount ?? 0));
    setError(null);
  }, [open, opportunity]);

  async function handleSave() {
    if (!opportunity) return;
    setError(null);
    setIsSaving(true);
    try {
      const parsed = parseMoney(finalAmountInput, "Final Amount (after discount)");
      if (parsed.error) {
        setError(parsed.error);
        return;
      }

      const result = await onSave({
        status: values.status,
        dateStarted: values.dateStarted,
        dateEnded: values.dateEnded,
        finalAmountAfterDiscount: parsed.value,
      });

      if (!result.ok) {
        setError(result.error ?? "Unable to save changes.");
      } else {
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  }

  if (!open || !opportunity) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-[90%] max-w-[720px] max-h-[calc(100vh-2rem)] rounded-2xl bg-white shadow-lg border border-slate-200 overflow-hidden sirkito-modal-enter flex flex-col">
        <div className="px-7 py-6 border-b border-slate-200 bg-slate-50 flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-slate-900 font-bold text-lg">Edit Opportunity</div>
              <div className="mt-1 text-xs text-slate-500">
                Opportunity ID:{" "}
                <span className="font-mono font-semibold text-slate-900">
                  {opportunity.fullId}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sirkito-gold/50"
              aria-label="Close"
              disabled={isSaving}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="px-7 py-6 overflow-y-auto flex-1">
          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          <div className="space-y-6">
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-3">Status</div>
              <select
                value={values.status}
                onChange={(e) => setValues((v) => ({ ...v, status: e.target.value as OpportunityStatus }))}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-sirkito-gold/50 focus:border-sirkito-gold/60"
              >
                <option value="Bidding">Bidding</option>
                <option value="Awarded">Awarded</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-3">Date Started</div>
                <input
                  type="date"
                  value={values.dateStarted ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, dateStarted: e.target.value || null }))}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-sirkito-gold/50 focus:border-sirkito-gold/60"
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-3">Date Ended</div>
                <input
                  type="date"
                  value={values.dateEnded ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, dateEnded: e.target.value || null }))}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-sirkito-gold/50 focus:border-sirkito-gold/60"
                />
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-500 mb-3">Final Amount (after discount)</div>
              <input
                value={finalAmountInput}
                onChange={(e) => setFinalAmountInput(e.target.value)}
                inputMode="decimal"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-sirkito-gold/50 focus:border-sirkito-gold/60"
              />
            </div>
          </div>
        </div>

        <div className="px-7 py-4 border-t border-slate-200 bg-white flex-shrink-0">
          <div className="flex items-center justify-end gap-3">
            <SirkitoButton variant="secondary" onClick={onClose} type="button" disabled={isSaving}>
              Cancel
            </SirkitoButton>
            <SirkitoButton onClick={handleSave} type="button" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </SirkitoButton>
          </div>
        </div>
      </div>
    </div>
  );
}

