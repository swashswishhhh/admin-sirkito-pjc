import * as React from "react";

export type BadgeVariant = "default" | "success" | "warning" | "outline";

export function Badge({
  variant = "default",
  className = "",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  const styles =
    variant === "success"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : variant === "warning"
        ? "bg-orange-50 text-orange-700 border-orange-200"
        : variant === "outline"
          ? "bg-transparent text-slate-700 border-slate-200"
          : "bg-sky-50 text-sky-800 border-sky-200";

  return (
    <span
      className={["inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", styles, className].join(" ")}
      {...props}
    />
  );
}

