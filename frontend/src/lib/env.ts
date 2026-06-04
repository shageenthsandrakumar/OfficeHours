export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) return false;
  if (url.includes("your-project")) return false;
  if (anonKey.includes("your-supabase") || anonKey === "your-anon-key") return false;
  return url.startsWith("https://") && url.includes(".supabase.co");
}

export function supabaseSetupMessage(): string {
  return "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to frontend/.env.local, then restart npm run dev.";
}
