"use client";

import * as React from "react";
import { SirkitoButton } from "./SirkitoButton";

export type ConfirmModalProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200 p-6">
        <div className="text-slate-900 font-bold text-lg">{title}</div>
        {description ? (
          <div className="mt-2 text-sm text-slate-600">{description}</div>
        ) : null}

        <div className="mt-6 flex gap-3 justify-end">
          <SirkitoButton variant="secondary" onClick={onCancel} type="button">
            {cancelLabel}
          </SirkitoButton>
          <SirkitoButton onClick={onConfirm} type="button">
            {confirmLabel}
          </SirkitoButton>
        </div>
      </div>
    </div>
  );
}

