import { afterEach, describe, expect, it, vi } from "vitest";
import { appUrl } from "./utils";

describe("appUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses VITE_APP_DOMAIN without doubling slashes", () => {
    vi.stubEnv("VITE_APP_DOMAIN", "https://walkersandtalkers.org/");
    expect(appUrl("/login")).toBe("https://walkersandtalkers.org/login");
    expect(appUrl("c/abc")).toBe("https://walkersandtalkers.org/c/abc");
  });

  it("falls back to the current origin", () => {
    vi.stubEnv("VITE_APP_DOMAIN", undefined as unknown as string);
    expect(appUrl("/login")).toBe(`${window.location.origin}/login`);
  });
});
