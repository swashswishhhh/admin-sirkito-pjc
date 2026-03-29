"use client";

import * as React from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseClients";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001a40] via-[#003366] to-[#00509e] flex items-center justify-center p-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/[0.02] blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header band */}
          <div className="bg-[#003366] px-8 pt-10 pb-8 text-center">
            {/* Logo */}
            <div className="mx-auto mb-5 h-20 w-20 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center overflow-hidden ring-2 ring-white/20 shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logoSirkito.jpg"
                alt="Sirkito logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="text-white/70 text-sm font-medium tracking-widest uppercase mb-1">
              Sirkito EBC
            </div>
            <h1 className="text-white text-2xl font-bold leading-tight">
              Admin Portal
            </h1>
            <p className="mt-2 text-white/60 text-sm">
              Sign in to access the management system
            </p>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            {error ? (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                <svg
                  className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-semibold text-[#4B5563] mb-2 uppercase tracking-wide"
                >
                  Email Address
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@sirkito.com"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:ring-2 focus:ring-[#003366]/30 focus:border-[#003366]/60 focus:bg-white"
                  disabled={loading}
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-[#4B5563] mb-2 uppercase tracking-wide"
                >
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:ring-2 focus:ring-[#003366]/30 focus:border-[#003366]/60 focus:bg-white"
                  disabled={loading}
                />
              </div>

              <button
                id="login-submit"
                type="submit"
                disabled={loading || !email.trim() || !password}
                className="w-full h-11 rounded-xl bg-[#003366] text-white text-sm font-semibold shadow-md transition-all hover:bg-[#00509e] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#003366]/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                    Signing in…
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            {/* Footer note */}
            <div className="mt-6 text-center">
              <p className="text-xs text-slate-400">
                Access restricted to authorised personnel only
              </p>
            </div>
          </div>
        </div>

        {/* Bottom badge */}
        <div className="mt-6 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-white/70">
            <svg
              className="h-3 w-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Secured by Supabase Auth
          </span>
        </div>
      </div>
    </div>
  );
}
