type Env = Record<string, string | boolean | undefined>;

// Names of the build-time variables the Supabase client needs but didn't get.
export function missingSupabaseEnv(env: Env): string[] {
  return [
    !env.VITE_SUPABASE_URL && "VITE_SUPABASE_URL",
    !(env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_ANON_KEY) &&
      "VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY)",
  ].filter(Boolean) as string[];
}
