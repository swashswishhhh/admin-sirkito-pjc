import * as React from "react";

type Variant = "primary" | "secondary";

export type SirkitoButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export function SirkitoButton({
  variant = "primary",
  className = "",
  disabled,
  ...props
}: SirkitoButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-sirkito-gold/50";

  const styles =
    variant === "primary"
      ? "bg-sirkito-blue text-white hover:bg-sirkito-gold hover:text-slate-900 disabled:bg-slate-300 disabled:text-slate-600 disabled:hover:bg-slate-300"
      : "border border-slate-200 bg-white text-slate-800 hover:border-sirkito-gold/70 hover:bg-slate-50 disabled:border-slate-200 disabled:text-slate-400 disabled:bg-white";

  return (
    <button
      {...props}
      disabled={disabled}
      className={`${base} ${styles} ${className}`.trim()}
    />
  );
}

