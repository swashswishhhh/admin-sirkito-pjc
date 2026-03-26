"use client";

import * as React from "react";
import { SirkitoButton } from "./SirkitoButton";
import { formatMoney, parseMoney, validateContactNumber, validateRequired } from "@/lib/opportunityValidation";
import type { VatType } from "@/lib/opportunityTypes";
import type { IdConfig } from "@/lib/idConfigStorage";

type CreateValues = {
  projectName: string;
  location: string;
  client: string;
  contactPerson: string;
  contact: string;
  description: string;
  vat: VatType;
  estimatedAmount: number;
  submittedAmount: number;
  dateStarted: string | null; // YYYY-MM-DD or null
  dateEnded: string | null; // YYYY-MM-DD or null
  status: "Bidding" | "Awarded";
  finalAmountAfterDiscount: number;
};

function FloatingTextField({
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder?: string;
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
        // Keep placeholder as whitespace so the label can float cleanly.
        placeholder={placeholder ?? " "}
        inputMode={inputMode}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-4 pt-4 pb-0 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-sirkito-blue/30 focus:border-sirkito-blue/60"
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

function FloatingSelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  const [focused, setFocused] = React.useState(false);
  const active = focused || value.trim().length > 0;

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pt-4 pb-0 pr-9 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-sirkito-blue/30 focus:border-sirkito-blue/60"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
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
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  rows?: number;
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
        placeholder={placeholder ?? " "}
        rows={rows}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 pt-6 pb-3 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-sirkito-blue/30 focus:border-sirkito-blue/60 resize-y"
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

export function OpportunityCreateModal({
  open,
  onClose,
  nextFullIdPreview,
  nextPreviewLoading,
  isSubmitting,
  idConfig,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  nextFullIdPreview: string;
  /** True while fetching the next ID from Supabase (latest row by created_at). */
  nextPreviewLoading?: boolean;
  isSubmitting: boolean;
  idConfig: IdConfig;
  onSubmit: (values: CreateValues) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [values, setValues] = React.useState<CreateValues>({
    projectName: "",
    location: "",
    client: "",
    contactPerson: "",
    contact: "",
    description: "",
    vat: "VAT Ex.",
    estimatedAmount: 0,
    submittedAmount: 0,
    dateStarted: null,
    dateEnded: null,
    status: "Bidding",
    finalAmountAfterDiscount: 0,
  });

  const [estimatedAmountInput, setEstimatedAmountInput] = React.useState("0");
  const [submittedAmountInput, setSubmittedAmountInput] = React.useState("0");
  const [finalAmountAfterDiscountInput, setFinalAmountAfterDiscountInput] = React.useState("0");

  const [error, setError] = React.useState<string | null>(null);
  const [apiNextFullIdPreview, setApiNextFullIdPreview] = React.useState<string | null>(null);
  const [apiNextLoading, setApiNextLoading] = React.useState(false);

  const isSubmitDisabled =
    !values.projectName.trim() ||
    !values.location.trim() ||
    !values.client.trim() ||
    !values.contactPerson.trim() ||
    !values.contact.trim() ||
    !values.description.trim() ||
    !values.status;

  React.useEffect(() => {
    if (!open) return;
    // Reset each time modal opens to avoid confusing stale data.
    setValues({
      projectName: "",
      location: "",
      client: "",
      contactPerson: "",
      contact: "",
      description: "",
      vat: "VAT Ex.",
      estimatedAmount: 0,
      submittedAmount: 0,
      dateStarted: null,
      dateEnded: null,
      status: "Bidding",
      finalAmountAfterDiscount: 0,
    });
    setEstimatedAmountInput("0");
    setSubmittedAmountInput("0");
    setFinalAmountAfterDiscountInput("0");
    setError(null);
    setApiNextFullIdPreview(null);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = window.setTimeout(async () => {
      try {
        setApiNextLoading(true);
        const description = values.description.trim();
        const qs = new URLSearchParams();
        if (idConfig.yearPrefixMode !== "AUTO") qs.set("yearPrefix", idConfig.yearPrefixMode);
        qs.set("sequenceStart", String(idConfig.sequenceStart));
        qs.set("description", description);
        const response = await fetch(`/api/opportunities/next-preview?${qs.toString()}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as {
          nextFullId?: string;
          error?: string;
        };
        if (!cancelled) {
          if (response.ok && typeof data.nextFullId === "string") {
            setApiNextFullIdPreview(data.nextFullId);
          } else {
            setApiNextFullIdPreview(null);
          }
        }
      } catch {
        if (!cancelled) setApiNextFullIdPreview(null);
      } finally {
        if (!cancelled) setApiNextLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [open, values.description, idConfig.yearPrefixMode, idConfig.sequenceStart]);

  async function validateAndSubmit() {
    setError(null);

    const requiredChecks: Array<{ label: string; value: string }> = [
      { label: "Project Name", value: values.projectName },
      { label: "Location", value: values.location },
      { label: "Client", value: values.client },
      { label: "Contact Person", value: values.contactPerson },
      { label: "Contact", value: values.contact },
      { label: "Description", value: values.description },
    ];

    for (const check of requiredChecks) {
      const maybeErr = validateRequired(check.value, check.label);
      if (maybeErr) {
        setError(maybeErr);
        return;
      }
    }

    const contactErr = validateContactNumber(values.contact);
    if (contactErr) {
      setError(contactErr);
      return;
    }

    const est = parseMoney(estimatedAmountInput, "Estimated Amount");
    if (est.error) {
      setError(est.error);
      return;
    }
    const submitted = parseMoney(submittedAmountInput, "Submitted Amount");
    if (submitted.error) {
      setError(submitted.error);
      return;
    }

    const finalParsed = parseMoney(
      finalAmountAfterDiscountInput,
      "Final Amount (after discount)",
    );
    if (finalParsed.error) {
      setError(finalParsed.error);
      return;
    }

    const result = await onSubmit({
      ...values,
      estimatedAmount: est.value,
      submittedAmount: submitted.value,
      finalAmountAfterDiscount: finalParsed.value,
    });

    if (!result.ok) {
      setError(result.error ?? "Unable to save opportunity.");
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-[90%] max-w-[800px] max-h-[calc(100vh-2rem)] rounded-2xl bg-white shadow-lg border border-slate-200 overflow-hidden sirkito-modal-enter flex flex-col">
        <div className="px-7 py-6 border-b border-slate-200 bg-slate-50 flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-slate-900 font-bold text-lg flex items-center gap-2">
                <span aria-hidden="true" className="text-sirkito-gold">
                  +
                </span>
                Add Opportunity
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Enter project details to generate an ID.
              </div>
              <div className="mt-2 text-xs text-slate-500">Auto-generated Next ID preview</div>
              <div className="mt-1">
                <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm font-semibold text-slate-900">
                  {apiNextLoading || nextPreviewLoading ? (
                    <span className="text-slate-500 font-normal italic">Resolving…</span>
                  ) : (
                    apiNextFullIdPreview ?? nextFullIdPreview
                  )}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">Read-only system token</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sirkito-blue/30"
              aria-label="Close"
              disabled={isSubmitting}
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
              <div className="text-xs font-semibold text-slate-500 mb-3">
                SECTION 1-2: BASIC DETAILS
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FloatingTextField
                  label="Project Name"
                  value={values.projectName}
                  onChange={(next) =>
                    setValues((v) => ({ ...v, projectName: next }))
                  }
                  placeholder="e.g. Main Substation Upgrade - Lot A"
                />
                <FloatingTextField
                  label="Location"
                  value={values.location}
                  onChange={(next) =>
                    setValues((v) => ({ ...v, location: next }))
                  }
                  placeholder="e.g. Helsinki"
                />
                <FloatingTextField
                  label="Client"
                  value={values.client}
                  onChange={(next) => setValues((v) => ({ ...v, client: next }))}
                  placeholder="e.g. ABC Oy"
                />
                <FloatingTextField
                  label="Contact Person"
                  value={values.contactPerson}
                  onChange={(next) =>
                    setValues((v) => ({ ...v, contactPerson: next }))
                  }
                  placeholder="e.g. Matti Korhonen"
                />
                <FloatingTextField
                  label="Contact"
                  value={values.contact}
                  onChange={(next) => setValues((v) => ({ ...v, contact: next }))}
                  placeholder="e.g. +358 40 123 4567"
                />
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-500 mb-3">
                SECTION 3: DESCRIPTION
              </div>
              <FloatingTextAreaField
                label="Description"
                value={values.description}
                onChange={(next) =>
                  setValues((v) => ({ ...v, description: next }))
                }
                placeholder="Short scope, notes, or reference details..."
                rows={4}
              />
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-500 mb-3">
                SECTION 4: FINANCIAL
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FloatingSelectField
                  label="VAT"
                  value={values.vat}
                  onChange={(next) =>
                    setValues((v) => ({ ...v, vat: next as VatType }))
                  }
                  options={[
                    { value: "VAT Ex.", label: "VAT Ex." },
                    { value: "VAT Inc.", label: "VAT Inc." },
                  ]}
                />

                <FloatingSelectField
                  label="Status"
                  value={values.status}
                  onChange={(next) =>
                    setValues((v) => ({
                      ...v,
                      status: next as CreateValues["status"],
                    }))
                  }
                  options={[
                    { value: "Bidding", label: "Bidding" },
                    { value: "Awarded", label: "Awarded" },
                  ]}
                />

                <div>
                  <FloatingTextField
                    label="Estimated Amount"
                    value={estimatedAmountInput}
                    onChange={setEstimatedAmountInput}
                    inputMode="decimal"
                    placeholder="e.g. 12500"
                  />
                  <div className="mt-2 text-xs text-slate-500">
                    Preview:{" "}
                    <span className="font-mono">
                      {formatMoney(
                        Number(estimatedAmountInput.replace(/,/g, "")) || 0,
                      )}
                    </span>
                  </div>
                </div>

                <div>
                  <FloatingTextField
                    label="Submitted Amount"
                    value={submittedAmountInput}
                    onChange={setSubmittedAmountInput}
                    inputMode="decimal"
                    placeholder="e.g. 11950"
                  />
                  <div className="mt-2 text-xs text-slate-500">
                    Preview:{" "}
                    <span className="font-mono">
                      {formatMoney(
                        Number(submittedAmountInput.replace(/,/g, "")) || 0,
                      )}
                    </span>
                  </div>
                </div>

                <FloatingTextField
                  label="Date Started"
                  type="date"
                  value={values.dateStarted ?? ""}
                  onChange={(next) =>
                    setValues((v) => ({
                      ...v,
                      dateStarted: next || null,
                    }))
                  }
                />

                <FloatingTextField
                  label="Date Ended"
                  type="date"
                  value={values.dateEnded ?? ""}
                  onChange={(next) =>
                    setValues((v) => ({
                      ...v,
                      dateEnded: next || null,
                    }))
                  }
                />

                <div className="sm:col-span-2">
                  <FloatingTextField
                    label="Final Amount (after discount)"
                    value={finalAmountAfterDiscountInput}
                    onChange={setFinalAmountAfterDiscountInput}
                    inputMode="decimal"
                    placeholder="e.g. 12500"
                  />
                  <div className="mt-2 text-xs text-slate-500">
                    Preview:{" "}
                    <span className="font-mono">
                      {formatMoney(
                        Number(finalAmountAfterDiscountInput.replace(/,/g, "")) ||
                          0,
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-7 py-4 border-t border-slate-200 bg-white flex-shrink-0">
          <div className="flex items-center justify-end gap-3">
            <SirkitoButton variant="secondary" onClick={onClose} type="button" disabled={isSubmitting}>
              Cancel
            </SirkitoButton>
            <SirkitoButton
              onClick={validateAndSubmit}
              type="button"
              disabled={isSubmitDisabled || isSubmitting}
            >
              {isSubmitting ? "Saving to Sirkito DB..." : "Create Opportunity"}
            </SirkitoButton>
          </div>
        </div>
      </div>
    </div>
  );
}

