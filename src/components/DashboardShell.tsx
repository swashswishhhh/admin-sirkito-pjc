"use client";

import * as React from "react";
import { OpportunityManagementSystem } from "./OpportunityManagementSystem";

export function DashboardShell() {
  return (
    <div className="min-h-screen bg-white">
      <div className="flex min-h-screen">
        <aside className="w-72 bg-sirkito-blue text-white px-6 py-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center font-black text-white">
              S
            </div>
            <div>
              <div className="text-sm font-semibold text-white/90">
                Sirkito EBC
              </div>
              <div className="text-lg font-bold leading-tight">
                Admin Portal
              </div>
            </div>
          </div>

          <nav className="mt-8 space-y-3">
            <div className="w-full rounded-xl bg-white/10 px-4 py-3 text-left font-semibold border-l-4 border-sky-300/90">
              Opportunities
            </div>
          </nav>
        </aside>

        <div className="flex-1">
          <header className="px-8 py-6 border-b border-[#E5E7EB] bg-white">
            <div className="flex items-start justify-between gap-6">
              <div>
                <h1 className="text-2xl font-bold text-[#1A1A1A]">
                  Opportunity ID Management System
                </h1>
                <p className="mt-1 text-sm text-[#4B5563]">
                  Generate and maintain versioned IDs.
                </p>
              </div>
              <div className="hidden sm:block text-right">
                <div className="text-xs font-semibold text-slate-500">
                  Brand
                </div>
                <div className="mt-2 text-sm font-semibold text-sirkito-blue">
                  Sirkito Deep Blue Accent
                </div>
              </div>
            </div>
          </header>

          <main className="p-8">
            <OpportunityManagementSystem />
          </main>
        </div>
      </div>
    </div>
  );
}

