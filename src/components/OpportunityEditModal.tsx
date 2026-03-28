"use client";

import * as React from "react";
import { SirkitoButton } from "./SirkitoButton";
import type { OpportunitySnapshot, OpportunityStatus, VatType } from "@/lib/opportunityTypes";
import {
  formatMoney,
  parseMoney,
  validateContactNumber,
  validateRequired,
} from "@/lib/opportunityValidation";

export type OpportunityEditValues = {
  projectName: string;
  location: string;
  client: string;
  contactPerson: string;
  contact: string;
  description: string;
  vat: VatType;
  estimatedAmount: number;
  submittedAmount: number;
  status: OpportunityStatus;
  dateStarted: string | null;
  dateEnded: string | null;
  finalAmountAfterDiscount: number | null;
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
  onSave: (values: OpportunityEditValues) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [values, setValues] = React.useState<OpportunityEditValues>({
    projectName: "",
    location: "",
    client: "",
    contactPerson: "",
    contact: "",
    description: "",
    vat: "VAT Ex.",
    estimatedAmount: 0,
    submittedAmount: 0,
    status: "Bidding",
    dateStarted: null,
    dateEnded: null,
    finalAmountAfterDiscount: null,
  });

  const [estimatedInput, setEstimatedInput] = React.useState("0");
  const [submittedInput, setSubmittedInput] = React.useState("0");
  const [finalInput, setFinalInput] = React.useState("0");

  const [error, setError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open || !opportunity) return;
    setValues({
      projectName: opportunity.projectName,
      location: opportunity.location,
      client: opportunity.client,
      contactPerson: opportunity.contactPerson,
      contact: opportunity.contact,
      description: opportunity.description,
      vat: opportunity.vat,
      estimatedAmount: opportunity.estimatedAmount,
      submittedAmount: opportunity.submittedAmount,
      status: opportunity.status,
      dateStarted: opportunity.dateStarted ?? null,
      dateEnded: opportunity.dateEnded ?? null,
      finalAmountAfterDiscount: opportunity.finalAmountAfterDiscount,
    });
    setEstimatedInput(String(opportunity.estimatedAmount));
    setSubmittedInput(String(opportunity.submittedAmount));
    setFinalInput(
      opportunity.finalAmountAfterDiscount === null || opportunity.finalAmountAfterDiscount === undefined
        ? "0"
        : String(opportunity.finalAmountAfterDiscount),
    );
    setError(null);
  }, [open, opportunity]);

  async function handleSave() {
    if (!opportunity) return;
    setError(null);
    setIsSaving(true);
    try {
      const checks: Array<{ label: string; value: string }> = [
        { label: "Project Name", value: values.projectName },
        { label: "Location", value: values.location },
        { label: "Client", value: values.client },
        { label: "Contact Person", value: values.contactPerson },
        { label: "Contact", value: values.contact },
        { label: "Description", value: values.description },
      ];
      for (const c of checks) {
        const e = validateRequired(c.value, c.label);
        if (e) {
          setError(e);
          return;
        }
      }

      const contactErr = validateContactNumber(values.contact);
      if (contactErr) {
        setError(contactErr);
        return;
      }

      const est = parseMoney(estimatedInput, "Estimated Amount");
      if (est.error) {
        setError(est.error);
        return;
      }
      const sub = parseMoney(submittedInput, "Submitted Amount");
      if (sub.error) {
        setError(sub.error);
        return;
      }

      const trimmedFinal = finalInput.trim();
      let finalVal: number | null = null;
      if (trimmedFinal.length > 0) {
        const fin = parseMoney(finalInput, "Final Amount (after discount)");
        if (fin.error) {
          setError(fin.error);
          return;
        }
        finalVal = fin.value;
      }

      const result = await onSave({
        ...values,
        estimatedAmount: est.value,
        submittedAmount: sub.value,
        finalAmountAfterDiscount: finalVal,
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

  const fieldClass =
    "mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-sirkito-blue/30 focus:border-sirkito-blue/60";
  const labelClass = "text-xs font-semibold text-slate-600";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-[95%] max-w-[900px] max-h-[calc(100vh-2rem)] rounded-2xl bg-white shadow-lg border border-slate-200 overflow-hidden sirkito-modal-enter flex flex-col">
        <div className="px-7 py-6 border-b border-slate-200 bg-slate-50 flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-slate-900 font-bold text-lg">Edit Opportunity</div>
              <div className="mt-1 text-xs text-slate-500">
                Opportunity ID:{" "}
                <span className="font-mono font-semibold text-slate-900">{opportunity.fullId}</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                All fields below sync to Supabase and Zoho CRM (Deal mapped by Custom Opportunity ID).
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sirkito-blue/30"
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={labelClass}>Project Name</label>
              <input
                value={values.projectName}
                onChange={(e) => setValues((v) => ({ ...v, projectName: e.target.value }))}
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Location</label>
              <input
                value={values.location}
                onChange={(e) => setValues((v) => ({ ...v, location: e.target.value }))}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Client</label>
              <input
                value={values.client}
                onChange={(e) => setValues((v) => ({ ...v, client: e.target.value }))}
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Contact Person</label>
              <input
                value={values.contactPerson}
                onChange={(e) => setValues((v) => ({ ...v, contactPerson: e.target.value }))}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Contact Number</label>
              <input
                value={values.contact}
                onChange={(e) => setValues((v) => ({ ...v, contact: e.target.value }))}
                className={fieldClass}
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Description</label>
              <textarea
                value={values.description}
                onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
                rows={3}
                className={`${fieldClass} h-auto min-h-[88px] py-3`}
              />
            </div>

            <div>
              <label className={labelClass}>VAT</label>
              <select
                value={values.vat}
                onChange={(e) => setValues((v) => ({ ...v, vat: e.target.value as VatType }))}
                className={fieldClass}
              >
                <option value="VAT Ex.">VAT Ex.</option>
                <option value="VAT Inc.">VAT Inc.</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select
                value={values.status}
                onChange={(e) =>
                  setValues((v) => ({ ...v, status: e.target.value as OpportunityStatus }))
                }
                className={fieldClass}
              >
                <option value="Bidding">Bidding</option>
                <option value="Awarded">Awarded</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Estimated Amount</label>
              <input
                value={estimatedInput}
                onChange={(e) => setEstimatedInput(e.target.value)}
                inputMode="decimal"
                className={fieldClass}
              />
              <div className="mt-1 text-xs text-slate-500 font-mono">
                {formatMoney(Number(estimatedInput.replace(/,/g, "")) || 0)}
              </div>
            </div>
            <div>
              <label className={labelClass}>Submitted Amount</label>
              <input
                value={submittedInput}
                onChange={(e) => setSubmittedInput(e.target.value)}
                inputMode="decimal"
                className={fieldClass}
              />
              <div className="mt-1 text-xs text-slate-500 font-mono">
                {formatMoney(Number(submittedInput.replace(/,/g, "")) || 0)}
              </div>
            </div>

            <div>
              <label className={labelClass}>Date Started</label>
              <input
                type="date"
                value={values.dateStarted ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, dateStarted: e.target.value || null }))
                }
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Date Ended</label>
              <input
                type="date"
                value={values.dateEnded ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, dateEnded: e.target.value || null }))}
                className={fieldClass}
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>
                Final Amount (after discount) — leave blank to clear
              </label>
              <input
                value={finalInput}
                onChange={(e) => setFinalInput(e.target.value)}
                inputMode="decimal"
                className={fieldClass}
              />
              <div className="mt-1 text-xs text-slate-500 font-mono">
                {finalInput.trim()
                  ? formatMoney(Number(finalInput.replace(/,/g, "")) || 0)
                  : "—"}
              </div>
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
