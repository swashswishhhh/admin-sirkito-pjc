"use client";

import * as React from "react";

type ToastContextValue = {
  showToast: (message: string) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = React.useState<{ message: string; id: number } | null>(null);

  const showToast = React.useCallback((message: string) => {
    const id = Date.now();
    setToast({ message, id });
  }, []);

  React.useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 1200);
    return () => window.clearTimeout(t);
  }, [toast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 pointer-events-none">
        {toast ? (
          <div className="rounded-xl bg-slate-900 text-white shadow-lg px-4 py-2 text-sm font-semibold">
            {toast.message}
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

