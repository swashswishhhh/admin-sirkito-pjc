"use client";

import * as React from "react";
import { SirkitoButton } from "./SirkitoButton";
import { formatMoney, parseMoney, validateContactNumber, validateRequired } from "@/lib/opportunityValidation";
import type { VatType } from "@/lib/opportunityTypes";

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
};

export function OpportunityCreateModal({
  open,
  onClose,
  nextFullIdPreview,
  isSubmitting,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  nextFullIdPreview: string;
  isSubmitting: boolean;
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
  });

  const [estimatedAmountInput, setEstimatedAmountInput] = React.useState("0");
  const [submittedAmountInput, setSubmittedAmountInput] = React.useState("0");

  const [error, setError] = React.useState<string | null>(null);

  const isSubmitDisabled =
    !values.projectName.trim() ||
    !values.location.trim() ||
    !values.client.trim() ||
    !values.contactPerson.trim() ||
    !values.contact.trim() ||
    !values.description.trim();

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
    });
    setEstimatedAmountInput("0");
    setSubmittedAmountInput("0");
    setError(null);
  }, [open]);

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

    const result = await onSubmit({
      ...values,
      estimatedAmount: est.value,
      submittedAmount: submitted.value,
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
              <div className="mt-2 text-xs text-slate-500">
                Next ID preview:{" "}
                <span className="font-mono font-semibold text-slate-900">
                  {nextFullIdPreview}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sirkito-gold/50"
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

          <div className="space-y-8">
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-3">
                SECTION 1: BASIC INFO
              </div>
              <label className="text-xs font-medium text-slate-700">
                Project Name
              </label>
              <input
                value={values.projectName}
                onChange={(e) =>
                  setValues((v) => ({ ...v, projectName: e.target.value }))
                }
                placeholder="e.g. Main Substation Upgrade - Lot A"
                className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-sirkito-gold/50 focus:border-sirkito-gold/60"
              />
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-500 mb-3">
                SECTION 2: DETAILS
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Location
                  </label>
                  <input
                    value={values.location}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, location: e.target.value }))
                    }
                    placeholder="e.g. Helsinki"
                    className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-sirkito-gold/50 focus:border-sirkito-gold/60"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Client
                  </label>
                  <input
                    value={values.client}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, client: e.target.value }))
                    }
                    placeholder="e.g. ABC Oy"
                    className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-sirkito-gold/50 focus:border-sirkito-gold/60"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Contact Person
                  </label>
                  <input
                    value={values.contactPerson}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, contactPerson: e.target.value }))
                    }
                    placeholder="e.g. Matti Korhonen"
                    className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-sirkito-gold/50 focus:border-sirkito-gold/60"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Contact
                  </label>
                  <input
                    value={values.contact}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, contact: e.target.value }))
                    }
                    placeholder="e.g. +358 40 123 4567"
                    className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-sirkito-gold/50 focus:border-sirkito-gold/60"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-500 mb-3">
                SECTION 3: DESCRIPTION
              </div>
              <label className="text-xs font-medium text-slate-700">
                Description
              </label>
              <textarea
                value={values.description}
                onChange={(e) =>
                  setValues((v) => ({ ...v, description: e.target.value }))
                }
                placeholder="Short scope, notes, or reference details..."
                rows={4}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-sirkito-gold/50 focus:border-sirkito-gold/60"
              />
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-500 mb-3">
                SECTION 4: FINANCIAL
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700">VAT</label>
                  <select
                    value={values.vat}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, vat: e.target.value as VatType }))
                    }
                    className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-sirkito-gold/50 focus:border-sirkito-gold/60"
                  >
                    <option value="VAT Ex.">VAT Ex.</option>
                    <option value="VAT Inc.">VAT Inc.</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Estimated Amount
                  </label>
                  <input
                    value={estimatedAmountInput}
                    onChange={(e) => setEstimatedAmountInput(e.target.value)}
                    inputMode="decimal"
                    placeholder="e.g. 12500"
                    className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-sirkito-gold/50 focus:border-sirkito-gold/60"
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

                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-700">
                    Submitted Amount
                  </label>
                  <input
                    value={submittedAmountInput}
                    onChange={(e) => setSubmittedAmountInput(e.target.value)}
                    inputMode="decimal"
                    placeholder="e.g. 11950"
                    className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-sirkito-gold/50 focus:border-sirkito-gold/60"
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

