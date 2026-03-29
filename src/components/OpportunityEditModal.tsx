"use client";

import * as React from "react";
import { SirkitoButton } from "./SirkitoButton";
import type { OpportunitySnapshot, OpportunityStatus, VatType } from "@/lib/opportunityTypes";
import { formatMoney, parseMoney, validateContactNumber, validateRequired } from "@/lib/opportunityValidation";

type EditValues = {
  // Identity
  projectName: string;
  location: string;
  client: string;
  contactPerson: string;
  contact: string;
  description: string;
  vat: VatType;
  // Financial
  estimatedAmount: number;
  submittedAmount: number;
  finalAmountAfterDiscount: number;
  // Status & dates
  status: OpportunityStatus;
  dateStarted: string | null;
  dateEnded: string | null;
};

function FloatingTextField({
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  disabled?: boolean;
}) {
  const [focused, setFocused] = React.useState(false);
  const active = focused || value.trim().length > 0;

  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder=" "
        inputMode={inputMode}
        disabled={disabled}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-4 pt-4 pb-0 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-sirkito-gold/50 focus:border-sirkito-gold/60 disabled:bg-slate-50 disabled:text-slate-400"
      />
      <label
        className={[
          "absolute left-4 transition-all pointer-events-none select-none",
          active ? "top-1 text-[11px] text-sirkito-blue/80" : "top-3 text-sm text-slate-400",
        ].join(" ")}
      >
        {label}
      </label>
    </div>
  );
}

function FloatingTextAreaField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const [focused, setFocused] = React.useState(false);
  const active = focused || value.trim().length > 0;

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder=" "
        rows={3}
        disabled={disabled}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 pt-6 pb-3 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-sirkito-gold/50 focus:border-sirkito-gold/60 resize-y disabled:bg-slate-50 disabled:text-slate-400"
      />
      <label
        className={[
          "absolute left-4 transition-all pointer-events-none select-none",
          active ? "top-2 text-[11px] text-sirkito-blue/80" : "top-4 text-sm text-slate-400",
        ].join(" ")}
      >
        {label}
      </label>
    </div>
  );
}

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
    projectName: "",
    location: "",
    client: "",
    contactPerson: "",
    contact: "",
    description: "",
    vat: "VAT Ex.",
    estimatedAmount: 0,
    submittedAmount: 0,
    finalAmountAfterDiscount: 0,
    status: "Bidding",
    dateStarted: null,
    dateEnded: null,
  });

  const [estimatedInput, setEstimatedInput] = React.useState("0");
  const [submittedInput, setSubmittedInput] = React.useState("0");
  const [finalAmountInput, setFinalAmountInput] = React.useState("0");
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
      finalAmountAfterDiscount: opportunity.finalAmountAfterDiscount ?? 0,
      status: opportunity.status,
      dateStarted: opportunity.dateStarted ?? null,
      dateEnded: opportunity.dateEnded ?? null,
    });
    setEstimatedInput(String(opportunity.estimatedAmount ?? 0));
    setSubmittedInput(String(opportunity.submittedAmount ?? 0));
    setFinalAmountInput(String(opportunity.finalAmountAfterDiscount ?? 0));
    setError(null);
  }, [open, opportunity]);

  async function handleSave() {
    if (!opportunity) return;
    setError(null);

    // Required field validation
    const checks = [
      { label: "Project Name", value: values.projectName },
      { label: "Location", value: values.location },
      { label: "Client", value: values.client },
      { label: "Contact Person", value: values.contactPerson },
      { label: "Contact", value: values.contact },
      { label: "Description", value: values.description },
    ];
    for (const c of checks) {
      const err = validateRequired(c.value, c.label);
      if (err) { setError(err); return; }
    }

    const contactErr = validateContactNumber(values.contact);
    if (contactErr) { setError(contactErr); return; }

    const est = parseMoney(estimatedInput, "Estimated Amount");
    if (est.error) { setError(est.error); return; }

    const sub = parseMoney(submittedInput, "Submitted Amount");
    if (sub.error) { setError(sub.error); return; }

    const fin = parseMoney(finalAmountInput, "Final Amount (after discount)");
    if (fin.error) { setError(fin.error); return; }

    setIsSaving(true);
    try {
      const result = await onSave({
        ...values,
        estimatedAmount: est.value,
        submittedAmount: sub.value,
        finalAmountAfterDiscount: fin.value,
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
      <div className="w-[95%] max-w-[800px] max-h-[calc(100vh-2rem)] rounded-2xl bg-white shadow-lg border border-slate-200 overflow-hidden sirkito-modal-enter flex flex-col">
        {/* Header */}
        <div className="px-7 py-6 border-b border-slate-200 bg-slate-50 flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-slate-900 font-bold text-lg">Edit Opportunity</div>
              <div className="mt-1 text-xs text-slate-500">
                Editing:{" "}
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

        {/* Body */}
        <div className="px-7 py-6 overflow-y-auto flex-1">
          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          <div className="space-y-6">
            {/* Section 1: Basic Details */}
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">
                Basic Details
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FloatingTextField
                  label="Project Name"
                  value={values.projectName}
                  onChange={(v) => setValues((x) => ({ ...x, projectName: v }))}
                  disabled={isSaving}
                />
                <FloatingTextField
                  label="Location"
                  value={values.location}
                  onChange={(v) => setValues((x) => ({ ...x, location: v }))}
                  disabled={isSaving}
                />
                <FloatingTextField
                  label="Client"
                  value={values.client}
                  onChange={(v) => setValues((x) => ({ ...x, client: v }))}
                  disabled={isSaving}
                />
                <FloatingTextField
                  label="Contact Person"
                  value={values.contactPerson}
                  onChange={(v) => setValues((x) => ({ ...x, contactPerson: v }))}
                  disabled={isSaving}
                />
                <FloatingTextField
                  label="Contact"
                  value={values.contact}
                  onChange={(v) => setValues((x) => ({ ...x, contact: v }))}
                  disabled={isSaving}
                />
              </div>
            </div>

            {/* Section 2: Description */}
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">
                Description
              </div>
              <FloatingTextAreaField
                label="Description"
                value={values.description}
                onChange={(v) => setValues((x) => ({ ...x, description: v }))}
                disabled={isSaving}
              />
            </div>

            {/* Section 3: Financial */}
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">
                Financial
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* VAT */}
                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-2">VAT</div>
                  <select
                    value={values.vat}
                    onChange={(e) => setValues((x) => ({ ...x, vat: e.target.value as VatType }))}
                    disabled={isSaving}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-sirkito-gold/50 focus:border-sirkito-gold/60 disabled:bg-slate-50"
                  >
                    <option value="VAT Ex.">VAT Ex.</option>
                    <option value="VAT Inc.">VAT Inc.</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-2">Status</div>
                  <select
                    value={values.status}
                    onChange={(e) => setValues((x) => ({ ...x, status: e.target.value as OpportunityStatus }))}
                    disabled={isSaving}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-sirkito-gold/50 focus:border-sirkito-gold/60 disabled:bg-slate-50"
                  >
                    <option value="Bidding">Bidding</option>
                    <option value="Awarded">Awarded</option>
                  </select>
                </div>

                {/* Estimated Amount */}
                <div>
                  <FloatingTextField
                    label="Estimated Amount"
                    value={estimatedInput}
                    onChange={setEstimatedInput}
                    inputMode="decimal"
                    disabled={isSaving}
                  />
                  <div className="mt-1.5 text-xs text-slate-500">
                    Preview:{" "}
                    <span className="font-mono">
                      {formatMoney(Number(estimatedInput.replace(/,/g, "")) || 0)}
                    </span>
                  </div>
                </div>

                {/* Submitted Amount */}
                <div>
                  <FloatingTextField
                    label="Submitted Amount"
                    value={submittedInput}
                    onChange={setSubmittedInput}
                    inputMode="decimal"
                    disabled={isSaving}
                  />
                  <div className="mt-1.5 text-xs text-slate-500">
                    Preview:{" "}
                    <span className="font-mono">
                      {formatMoney(Number(submittedInput.replace(/,/g, "")) || 0)}
                    </span>
                  </div>
                </div>

                {/* Date Started */}
                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-2">Date Started</div>
                  <input
                    type="date"
                    value={values.dateStarted ?? ""}
                    onChange={(e) => setValues((x) => ({ ...x, dateStarted: e.target.value || null }))}
                    disabled={isSaving}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-sirkito-gold/50 focus:border-sirkito-gold/60 disabled:bg-slate-50"
                  />
                </div>

                {/* Date Ended */}
                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-2">Date Ended</div>
                  <input
                    type="date"
                    value={values.dateEnded ?? ""}
                    onChange={(e) => setValues((x) => ({ ...x, dateEnded: e.target.value || null }))}
                    disabled={isSaving}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-sirkito-gold/50 focus:border-sirkito-gold/60 disabled:bg-slate-50"
                  />
                </div>

                {/* Final Amount */}
                <div className="sm:col-span-2">
                  <FloatingTextField
                    label="Final Amount (after discount)"
                    value={finalAmountInput}
                    onChange={setFinalAmountInput}
                    inputMode="decimal"
                    disabled={isSaving}
                  />
                  <div className="mt-1.5 text-xs text-slate-500">
                    Preview:{" "}
                    <span className="font-mono">
                      {formatMoney(Number(finalAmountInput.replace(/,/g, "")) || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-7 py-4 border-t border-slate-200 bg-white flex-shrink-0">
          <div className="flex items-center justify-end gap-3">
            <SirkitoButton variant="secondary" onClick={onClose} type="button" disabled={isSaving}>
              Cancel
            </SirkitoButton>
            <SirkitoButton onClick={handleSave} type="button" disabled={isSaving}>
              {isSaving ? "Saving…" : "Save Changes"}
            </SirkitoButton>
          </div>
        </div>
      </div>
    </div>
  );
}
