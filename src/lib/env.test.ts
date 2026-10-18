import { describe, expect, it } from "vitest";
import { missingSupabaseEnv } from "./env";

describe("missingSupabaseEnv", () => {
  it("reports both variables when nothing is set", () => {
    expect(missingSupabaseEnv({})).toEqual([
      "VITE_SUPABASE_URL",
      "VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY)",
    ]);
  });

  it("accepts either the anon key or the publishable key", () => {
    expect(missingSupabaseEnv({ VITE_SUPABASE_URL: "u", VITE_SUPABASE_ANON_KEY: "k" })).toEqual([]);
    expect(missingSupabaseEnv({ VITE_SUPABASE_URL: "u", VITE_SUPABASE_PUBLISHABLE_KEY: "k" })).toEqual([]);
  });

  it("reports just the URL when only the key is set", () => {
    expect(missingSupabaseEnv({ VITE_SUPABASE_ANON_KEY: "k" })).toEqual(["VITE_SUPABASE_URL"]);
  });
});
