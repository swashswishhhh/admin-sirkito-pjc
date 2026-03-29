"use client";

import * as React from "react";
import { SirkitoButton } from "./SirkitoButton";
import type { OpportunitySnapshot, OpportunityStatus, VatType } from "@/lib/opportunityTypes";
import { formatMoney, parseMoney, validateContactNumber, validateRequired } from "@/lib/opportunityValidation";

type EditValues = {
  projectName: string;
  location: string;
  client: string;
  contactPerson: string;
  contact: string;
  description: string;
  vat: VatType;
  estimatedAmount: number;
  submittedAmount: number;
  finalAmountAfterDiscount: number;
  status: OpportunityStatus;
  dateStarted: string | null;
  dateEnded: string | null;
};

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
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-[95%] max-w-[820px] max-h-[calc(100vh-2rem)] rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden sirkito-modal-enter flex flex-col">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="px-7 py-5 border-b border-slate-100 bg-gradient-to-r from-[#003366] to-[#00509e] flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-white font-bold text-lg">Edit Opportunity</div>
              <div className="mt-1.5 inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5">
                <span className="text-[11px] text-white/60 uppercase tracking-wide">Editing ID:</span>
                <span className="font-mono text-sm font-bold text-white">{opportunity.fullId}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-white/70 hover:text-white hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/30 transition"
              aria-label="Close"
              disabled={isSaving}
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

          {/* Section: Basic Details */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-slate-100" />
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Basic Details</span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <FormField id="edit-project-name" label="Project Name" required>
                <input id="edit-project-name" type="text" value={values.projectName} onChange={(e) => setValues((x) => ({ ...x, projectName: e.target.value }))} placeholder="Enter project name..." className={inputCls} disabled={isSaving} />
              </FormField>
              <FormField id="edit-location" label="Location" required>
                <input id="edit-location" type="text" value={values.location} onChange={(e) => setValues((x) => ({ ...x, location: e.target.value }))} placeholder="Enter location..." className={inputCls} disabled={isSaving} />
              </FormField>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <FormField id="edit-client" label="Client" required>
                <input id="edit-client" type="text" value={values.client} onChange={(e) => setValues((x) => ({ ...x, client: e.target.value }))} placeholder="Enter client name..." className={inputCls} disabled={isSaving} />
              </FormField>
              <FormField id="edit-contact-person" label="Contact Person" required>
                <input id="edit-contact-person" type="text" value={values.contactPerson} onChange={(e) => setValues((x) => ({ ...x, contactPerson: e.target.value }))} placeholder="Enter contact person..." className={inputCls} disabled={isSaving} />
              </FormField>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField id="edit-contact" label="Contact Number" required>
                <input id="edit-contact" type="tel" value={values.contact} onChange={(e) => setValues((x) => ({ ...x, contact: e.target.value }))} placeholder="Enter contact number..." className={inputCls} disabled={isSaving} />
              </FormField>
            </div>
          </section>

          {/* Section: Description */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-slate-100" />
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Description</span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>
            <FormField id="edit-description" label="Scope / Description" required>
              <textarea
                id="edit-description"
                value={values.description}
                onChange={(e) => setValues((x) => ({ ...x, description: e.target.value }))}
                placeholder="Enter project scope or reference details..."
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 transition focus:ring-2 focus:ring-sirkito-blue/30 focus:border-sirkito-blue/60 resize-y disabled:bg-slate-50"
                disabled={isSaving}
              />
            </FormField>
          </section>

          {/* Section: Financial & Status */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-slate-100" />
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Financial & Status</span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField id="edit-vat" label="VAT Type">
                <div className="relative">
                  <select id="edit-vat" value={values.vat} onChange={(e) => setValues((x) => ({ ...x, vat: e.target.value as VatType }))} disabled={isSaving} className={selectCls}>
                    <option value="VAT Ex.">VAT Exclusive</option>
                    <option value="VAT Inc.">VAT Inclusive</option>
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg></div>
                </div>
              </FormField>

              <FormField id="edit-status" label="Status">
                <div className="relative">
                  <select id="edit-status" value={values.status} onChange={(e) => setValues((x) => ({ ...x, status: e.target.value as OpportunityStatus }))} disabled={isSaving} className={selectCls}>
                    <option value="Bidding">Bidding</option>
                    <option value="Awarded">Awarded</option>
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg></div>
                </div>
              </FormField>

              <FormField id="edit-estimated" label="Estimated Amount">
                <input id="edit-estimated" type="text" inputMode="decimal" value={estimatedInput} onChange={(e) => setEstimatedInput(e.target.value)} placeholder="0" className={inputCls} disabled={isSaving} />
                <div className="text-xs text-slate-400 font-mono">= {formatMoney(Number(estimatedInput.replace(/,/g, "")) || 0)}</div>
              </FormField>

              <FormField id="edit-submitted" label="Submitted Amount">
                <input id="edit-submitted" type="text" inputMode="decimal" value={submittedInput} onChange={(e) => setSubmittedInput(e.target.value)} placeholder="0" className={inputCls} disabled={isSaving} />
                <div className="text-xs text-slate-400 font-mono">= {formatMoney(Number(submittedInput.replace(/,/g, "")) || 0)}</div>
              </FormField>

              <FormField id="edit-date-started" label="Date Started">
                <input id="edit-date-started" type="date" value={values.dateStarted ?? ""} onChange={(e) => setValues((x) => ({ ...x, dateStarted: e.target.value || null }))} className={inputCls} disabled={isSaving} />
              </FormField>

              <FormField id="edit-date-ended" label="Date Ended">
                <input id="edit-date-ended" type="date" value={values.dateEnded ?? ""} onChange={(e) => setValues((x) => ({ ...x, dateEnded: e.target.value || null }))} className={inputCls} disabled={isSaving} />
              </FormField>

              <div className="sm:col-span-2">
                <FormField id="edit-final" label="Final Amount (after discount)">
                  <input id="edit-final" type="text" inputMode="decimal" value={finalAmountInput} onChange={(e) => setFinalAmountInput(e.target.value)} placeholder="0" className={inputCls} disabled={isSaving} />
                  <div className="text-xs text-slate-400 font-mono">= {formatMoney(Number(finalAmountInput.replace(/,/g, "")) || 0)}</div>
                </FormField>
              </div>
            </div>
          </section>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <div className="px-7 py-4 border-t border-slate-100 bg-slate-50 flex-shrink-0">
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
