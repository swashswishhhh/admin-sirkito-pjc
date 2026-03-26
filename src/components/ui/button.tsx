import * as React from "react";

export type ButtonVariant = "default" | "secondary" | "outline" | "ghost";

export function Button({
  variant = "default",
  className = "",
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const styles =
    variant === "default"
      ? "bg-sirkito-blue text-white hover:bg-sirkito-blue/90 disabled:bg-slate-300 disabled:text-slate-600"
      : variant === "secondary"
        ? "bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-600"
        : variant === "outline"
          ? "border border-slate-200 bg-white text-slate-800 hover:border-sirkito-blue/40 hover:bg-sirkito-blue/5 disabled:border-slate-200 disabled:text-slate-400"
          : "bg-transparent text-slate-700 hover:bg-slate-100 disabled:hover:bg-transparent";

  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-sirkito-blue/25";

  return (
    <button
      className={[base, styles, className].join(" ")}
      disabled={disabled}
      {...props}
    />
  );
}

