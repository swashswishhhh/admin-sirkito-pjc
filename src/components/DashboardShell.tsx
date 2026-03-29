"use client";

import * as React from "react";
import { OpportunityManagementSystem } from "./OpportunityManagementSystem";
import { DashboardHomeView } from "./DashboardHomeView";
import { DashboardSettingsView } from "./DashboardSettingsView";
import { DEFAULT_ID_CONFIG, loadIdConfig, saveIdConfig, type IdConfig } from "@/lib/idConfigStorage";
import { createSupabaseBrowserClient } from "@/lib/supabaseClients";
import { useRouter } from "next/navigation";

type NavKey = "dashboard" | "opportunities" | "settings";

function IconDashboard({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 13h8V3H3v10z" />
      <path d="M13 21h8V11h-8v10z" />
      <path d="M13 3h8v6h-8V3z" />
      <path d="M3 21h8v-6H3v6z" />
    </svg>
  );
}

function IconOpportunities({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M7 7h10" />
      <path d="M7 12h10" />
      <path d="M7 17h10" />
      <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    </svg>
  );
}

function IconSettings({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-1.41 3.41h-.2a1.65 1.65 0 0 0-1.6 1.2 2 2 0 0 1-3.8 0 1.65 1.65 0 0 0-1.6-1.2h-.2a2 2 0 0 1-1.41-3.41l.06-.06A1.65 1.65 0 0 0 4.6 15a2 2 0 0 1 0-6 1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 0 1 5.62 3.71h.2a1.65 1.65 0 0 0 1.6-1.2 2 2 0 0 1 3.8 0 1.65 1.65 0 0 0 1.6 1.2h.2a2 2 0 0 1 1.41 3.41l-.06.06A1.65 1.65 0 0 0 19.4 9a2 2 0 0 1 0 6z" />
    </svg>
  );
}

function NavButton({
  nav,
  label,
  icon,
  activeNav,
  sidebarCollapsed,
  onSelect,
}: {
  nav: NavKey;
  label: string;
  icon: React.ReactNode;
  activeNav: NavKey;
  sidebarCollapsed: boolean;
  onSelect: (nav: NavKey) => void;
}) {
  const isActive = activeNav === nav;
  return (
    <button
      type="button"
      onClick={() => onSelect(nav)}
      title={sidebarCollapsed ? label : undefined}
      className={[
        "w-full rounded-xl px-4 py-3 text-left font-semibold transition-colors flex items-center gap-3",
        isActive ? "bg-white/15 border-l-4 border-white/70" : "bg-white/0 hover:bg-white/10",
        sidebarCollapsed ? "justify-center" : "justify-start",
      ].join(" ")}
    >
      <span className="text-white/95">{icon}</span>
      <span className={sidebarCollapsed ? "hidden" : "block"}>{label}</span>
    </button>
  );
}

export function DashboardShell() {
  const [activeNav, setActiveNav] = React.useState<NavKey>("opportunities");
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [idConfig, setIdConfig] = React.useState<IdConfig>(() => DEFAULT_ID_CONFIG);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const loaded = loadIdConfig();
    setIdConfig(loaded);
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    saveIdConfig(idConfig);
  }, [idConfig]);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="flex min-h-screen">
        <aside
          className={[
            "bg-sirkito-blue text-white px-4 py-6 transition-[width] duration-200 flex flex-col",
            sidebarCollapsed ? "w-20" : "w-72",
          ].join(" ")}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logoSirkito.jpg"
                alt="Sirkito"
                className="h-full w-full object-contain"
              />
            </div>
            <div className={sidebarCollapsed ? "hidden" : "block"}>
              <div className="text-sm font-semibold text-white/90">Sirkito EBC</div>
              <div className="text-lg font-bold leading-tight">Admin Portal</div>
            </div>

            <button
              type="button"
              onClick={() => setSidebarCollapsed((v) => !v)}
              className="ml-auto rounded-lg p-2 text-white/90 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={sidebarCollapsed ? "Expand" : "Collapse"}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                {sidebarCollapsed ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
              </svg>
            </button>
          </div>

          <nav className="mt-8 space-y-3">
            <NavButton
              nav="dashboard"
              label="Dashboard"
              icon={<IconDashboard className="h-5 w-5" />}
              activeNav={activeNav}
              sidebarCollapsed={sidebarCollapsed}
              onSelect={setActiveNav}
            />
            <NavButton
              nav="opportunities"
              label="Opportunities"
              icon={<IconOpportunities className="h-5 w-5" />}
              activeNav={activeNav}
              sidebarCollapsed={sidebarCollapsed}
              onSelect={setActiveNav}
            />
            <NavButton
              nav="settings"
              label="Settings"
              icon={<IconSettings className="h-5 w-5" />}
              activeNav={activeNav}
              sidebarCollapsed={sidebarCollapsed}
              onSelect={setActiveNav}
            />
          </nav>

          {/* Logout button — pushed to the bottom */}
          <div className="mt-auto pt-4">
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              title="Logout"
              className={[
                "w-full rounded-xl px-4 py-3 text-left font-semibold transition-colors flex items-center gap-3",
                sidebarCollapsed ? "justify-center" : "justify-start",
                "bg-white/0 hover:bg-red-500/20 text-white/70 hover:text-red-200 disabled:opacity-50",
              ].join(" ")}
              aria-label="Logout"
            >
              {/* Power-off icon */}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 flex-shrink-0"
                aria-hidden="true"
              >
                <path d="M18.36 6.64A9 9 0 1 1 5.64 6.64" />
                <line x1="12" y1="2" x2="12" y2="12" />
              </svg>
              <span className={sidebarCollapsed ? "hidden" : "block"}>
                {isLoggingOut ? "Logging out…" : "Logout"}
              </span>
            </button>
          </div>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col">
          <header className="px-8 py-6 border-b border-[#E5E7EB] bg-white flex-shrink-0">
            <div className="flex items-start justify-between gap-6">
              <div>
                <h1 className="text-2xl font-bold text-[#1A1A1A]">
                  {activeNav === "dashboard"
                    ? "Dashboard"
                    : activeNav === "settings"
                      ? "Settings"
                      : "Opportunity ID Management System"}
                </h1>
                <p className="mt-1 text-sm text-[#4B5563]">
                  {activeNav === "dashboard"
                    ? "Operational overview and trends."
                    : activeNav === "settings"
                      ? "Zoho integration and ID generation configuration."
                      : "Generate and maintain versioned IDs."}
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-3 text-right">
                <div className="rounded-2xl border border-sirkito-blue/10 bg-sirkito-blue/5 px-4 py-3">
                  <div className="text-sm font-bold text-sirkito-blue">Sirkito</div>
                  <div className="mt-1 text-sm font-semibold text-[#1A1A1A]">Corporate Admin Portal</div>
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 min-h-0 overflow-y-auto p-8">
            {activeNav === "opportunities" ? (
              <OpportunityManagementSystem idConfig={idConfig} />
            ) : activeNav === "dashboard" ? (
              <DashboardHomeView />
            ) : (
              <DashboardSettingsView idConfig={idConfig} onIdConfigChange={setIdConfig} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

