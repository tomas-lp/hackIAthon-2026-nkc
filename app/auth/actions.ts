"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function loginWithCredentials(email: string, password: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function logoutFromSession() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  await supabase.auth.signOut();
}
