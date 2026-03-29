"use server";

import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabaseClients";

export async function loginAction(email: string, password: string) {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    if (data.session) {
      const cookieStore = await cookies();
      cookieStore.set("sirkito-admin-session", data.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: data.session.expires_in,
        path: "/",
      });
      return { ok: true };
    }

    return { ok: false, error: "Login failed" };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal Server Error";
    return { ok: false, error: errorMessage };
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("sirkito-admin-session");
  return { ok: true };
}
