import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv, isSupabaseConfigured, supabaseSetupMessage } from "@/lib/env";

export function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(supabaseSetupMessage());
  }
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
