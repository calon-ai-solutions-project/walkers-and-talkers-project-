import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { londonToday } from "./useSessions";

describe("londonToday", () => {
  afterEach(() => vi.useRealTimers());

  // Sessions are keyed by the London calendar date; the check-in RPC uses
  // (now() at time zone 'Europe/London')::date, so the client must agree.
  it("is the London date, not the UTC date, late on a summer evening", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-30T23:30:00Z")); // 00:30 BST on 1 July
    expect(londonToday()).toBe("2026-07-01");
  });

  it("matches UTC in winter (GMT)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T23:30:00Z"));
    expect(londonToday()).toBe("2026-01-15");
  });
});
