import * as React from "react";

export function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={[
        "h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none",
        "focus:ring-2 focus:ring-sirkito-blue/25 focus:border-sirkito-blue/60",
        className,
      ].join(" ")}
      {...props}
    />
  );
}

