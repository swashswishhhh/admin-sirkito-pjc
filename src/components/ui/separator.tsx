import * as React from "react";

export function Separator({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={["h-px bg-slate-200", className].join(" ")} {...props} />;
}

