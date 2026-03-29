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
  dateStarted: string | null;
  dateEnded: string | null;
  status: "Bidding" | "Awarded";
  finalAmountAfterDiscount: number;
};

/** Shared label+input field with the label displayed ABOVE the input. */
function FormField({
  id,
  label,
  required,
  children,
}: {
  id?: string;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-xs font-semibold text-slate-600 uppercase tracking-wide"
      >
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 transition focus:ring-2 focus:ring-sirkito-blue/30 focus:border-sirkito-blue/60 disabled:bg-slate-50 disabled:text-slate-400";

const selectCls =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:ring-2 focus:ring-sirkito-blue/30 focus:border-sirkito-blue/60 disabled:bg-slate-50 appearance-none";

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

  // Debounced ID preview refresh when description changes
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
        const response = await fetch(`/api/opportunities/next-preview?${qs.toString()}`, { cache: "no-store" });
        const data = (await response.json()) as { nextFullId?: string; error?: string };
        if (!cancelled) {
          setApiNextFullIdPreview(response.ok && typeof data.nextFullId === "string" ? data.nextFullId : null);
        }
      } catch {
        if (!cancelled) setApiNextFullIdPreview(null);
      } finally {
        if (!cancelled) setApiNextLoading(false);
      }
    }, 250);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [open, values.description, idConfig.yearPrefixMode, idConfig.sequenceStart]);

  async function validateAndSubmit() {
    setError(null);
    const required = [
      { label: "Project Name", value: values.projectName },
      { label: "Location", value: values.location },
      { label: "Client", value: values.client },
      { label: "Contact Person", value: values.contactPerson },
      { label: "Contact", value: values.contact },
      { label: "Description", value: values.description },
    ];
    for (const c of required) {
      const e = validateRequired(c.value, c.label);
      if (e) { setError(e); return; }
    }
    const contactErr = validateContactNumber(values.contact);
    if (contactErr) { setError(contactErr); return; }

    const est = parseMoney(estimatedAmountInput, "Estimated Amount");
    if (est.error) { setError(est.error); return; }
    const sub = parseMoney(submittedAmountInput, "Submitted Amount");
    if (sub.error) { setError(sub.error); return; }
    const fin = parseMoney(finalAmountAfterDiscountInput, "Final Amount (after discount)");
    if (fin.error) { setError(fin.error); return; }

    const result = await onSubmit({
      ...values,
      estimatedAmount: est.value,
      submittedAmount: sub.value,
      finalAmountAfterDiscount: fin.value,
    });
    if (!result.ok) setError(result.error ?? "Unable to save opportunity.");
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-[95%] max-w-[820px] max-h-[calc(100vh-2rem)] rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden sirkito-modal-enter flex flex-col">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="px-7 py-5 border-b border-slate-100 bg-gradient-to-r from-[#003366] to-[#00509e] flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-white font-bold text-lg flex items-center gap-2">
                <span aria-hidden="true" className="text-yellow-300 text-xl">+</span>
                Add Opportunity
              </div>
              <div className="mt-1 text-sm text-white/70">Enter project details to generate a versioned ID.</div>
              {/* ID Preview */}
              <div className="mt-3 inline-flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-2">
                <div>
                  <div className="text-[11px] text-white/60 uppercase tracking-wide">Next ID Preview</div>
                  <div className="mt-0.5 font-mono text-sm font-bold text-white">
                    {apiNextLoading || nextPreviewLoading ? (
                      <span className="italic font-normal text-white/60">Resolving…</span>
                    ) : (
                      apiNextFullIdPreview ?? nextFullIdPreview
                    )}
                  </div>
                </div>
                <div className="rounded-full bg-yellow-400/20 border border-yellow-400/30 px-2 py-0.5 text-[10px] font-semibold text-yellow-200 uppercase tracking-wider">
                  Auto
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-white/70 hover:text-white hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/30 transition"
              aria-label="Close"
              disabled={isSubmitting}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────────── */}
        <div className="px-7 py-6 overflow-y-auto flex-1 space-y-7">
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-start gap-2">
              <svg className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          ) : null}

          {/* Section 1: Basic Details */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-slate-100" />
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Basic Details</span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>
            {/* Row 1: Project Name + Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <FormField id="create-project-name" label="Project Name" required>
                <input
                  id="create-project-name"
                  type="text"
                  value={values.projectName}
                  onChange={(e) => setValues((v) => ({ ...v, projectName: e.target.value }))}
                  placeholder="Enter project name..."
                  className={inputCls}
                  disabled={isSubmitting}
                />
              </FormField>
              <FormField id="create-location" label="Location" required>
                <input
                  id="create-location"
                  type="text"
                  value={values.location}
                  onChange={(e) => setValues((v) => ({ ...v, location: e.target.value }))}
                  placeholder="Enter location..."
                  className={inputCls}
                  disabled={isSubmitting}
                />
              </FormField>
            </div>
            {/* Row 2: Client + Contact Person */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <FormField id="create-client" label="Client" required>
                <input
                  id="create-client"
                  type="text"
                  value={values.client}
                  onChange={(e) => setValues((v) => ({ ...v, client: e.target.value }))}
                  placeholder="Enter client name..."
                  className={inputCls}
                  disabled={isSubmitting}
                />
              </FormField>
              <FormField id="create-contact-person" label="Contact Person" required>
                <input
                  id="create-contact-person"
                  type="text"
                  value={values.contactPerson}
                  onChange={(e) => setValues((v) => ({ ...v, contactPerson: e.target.value }))}
                  placeholder="Enter contact person..."
                  className={inputCls}
                  disabled={isSubmitting}
                />
              </FormField>
            </div>
            {/* Row 3: Contact (full-width) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField id="create-contact" label="Contact Number" required>
                <input
                  id="create-contact"
                  type="tel"
                  value={values.contact}
                  onChange={(e) => setValues((v) => ({ ...v, contact: e.target.value }))}
                  placeholder="Enter contact number..."
                  className={inputCls}
                  disabled={isSubmitting}
                />
              </FormField>
            </div>
          </section>

          {/* Section 2: Description */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-slate-100" />
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Description</span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>
            <FormField id="create-description" label="Scope / Description" required>
              <textarea
                id="create-description"
                value={values.description}
                onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
                placeholder="Enter project scope or reference details... (used to generate the category code)"
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 transition focus:ring-2 focus:ring-sirkito-blue/30 focus:border-sirkito-blue/60 resize-y disabled:bg-slate-50"
                disabled={isSubmitting}
              />
              <div className="text-[11px] text-slate-400">
                💡 The first letters of each keyword (e.g. "Mechanical Plumbing" → <span className="font-mono font-semibold text-sirkito-blue">MP</span>) become the category code in the generated ID.
              </div>
            </FormField>
          </section>

          {/* Section 3: Financial */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-slate-100" />
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Financial & Status</span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField id="create-vat" label="VAT Type">
                <div className="relative">
                  <select
                    id="create-vat"
                    value={values.vat}
                    onChange={(e) => setValues((v) => ({ ...v, vat: e.target.value as VatType }))}
                    className={selectCls}
                    disabled={isSubmitting}
                  >
                    <option value="VAT Ex.">VAT Exclusive</option>
                    <option value="VAT Inc.">VAT Inclusive</option>
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                  </div>
                </div>
              </FormField>

              <FormField id="create-status" label="Status">
                <div className="relative">
                  <select
                    id="create-status"
                    value={values.status}
                    onChange={(e) => setValues((v) => ({ ...v, status: e.target.value as CreateValues["status"] }))}
                    className={selectCls}
                    disabled={isSubmitting}
                  >
                    <option value="Bidding">Bidding</option>
                    <option value="Awarded">Awarded</option>
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                  </div>
                </div>
              </FormField>

              <FormField id="create-estimated" label="Estimated Amount">
                <input
                  id="create-estimated"
                  type="text"
                  inputMode="decimal"
                  value={estimatedAmountInput}
                  onChange={(e) => setEstimatedAmountInput(e.target.value)}
                  placeholder="0"
                  className={inputCls}
                  disabled={isSubmitting}
                />
                <div className="text-xs text-slate-400 font-mono">
                  = {formatMoney(Number(estimatedAmountInput.replace(/,/g, "")) || 0)}
                </div>
              </FormField>

              <FormField id="create-submitted" label="Submitted Amount">
                <input
                  id="create-submitted"
                  type="text"
                  inputMode="decimal"
                  value={submittedAmountInput}
                  onChange={(e) => setSubmittedAmountInput(e.target.value)}
                  placeholder="0"
                  className={inputCls}
                  disabled={isSubmitting}
                />
                <div className="text-xs text-slate-400 font-mono">
                  = {formatMoney(Number(submittedAmountInput.replace(/,/g, "")) || 0)}
                </div>
              </FormField>

              <FormField id="create-date-started" label="Date Started">
                <input
                  id="create-date-started"
                  type="date"
                  value={values.dateStarted ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, dateStarted: e.target.value || null }))}
                  className={inputCls}
                  disabled={isSubmitting}
                />
              </FormField>

              <FormField id="create-date-ended" label="Date Ended">
                <input
                  id="create-date-ended"
                  type="date"
                  value={values.dateEnded ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, dateEnded: e.target.value || null }))}
                  className={inputCls}
                  disabled={isSubmitting}
                />
              </FormField>

              <div className="sm:col-span-2">
                <FormField id="create-final" label="Final Amount (after discount)">
                  <input
                    id="create-final"
                    type="text"
                    inputMode="decimal"
                    value={finalAmountAfterDiscountInput}
                    onChange={(e) => setFinalAmountAfterDiscountInput(e.target.value)}
                    placeholder="0"
                    className={inputCls}
                    disabled={isSubmitting}
                  />
                  <div className="text-xs text-slate-400 font-mono">
                    = {formatMoney(Number(finalAmountAfterDiscountInput.replace(/,/g, "")) || 0)}
                  </div>
                </FormField>
              </div>
            </div>
          </section>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <div className="px-7 py-4 border-t border-slate-100 bg-slate-50 flex-shrink-0">
          <div className="flex items-center justify-end gap-3">
            <SirkitoButton variant="secondary" onClick={onClose} type="button" disabled={isSubmitting}>
              Cancel
            </SirkitoButton>
            <SirkitoButton onClick={validateAndSubmit} type="button" disabled={isSubmitDisabled || isSubmitting}>
              {isSubmitting ? "Saving to Sirkito DB…" : "Create Opportunity"}
            </SirkitoButton>
          </div>
        </div>
      </div>
    </div>
  );
}
