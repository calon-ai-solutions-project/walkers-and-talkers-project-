import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const rpc = vi.fn();
const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...a: unknown[]) => rpc(...a), functions: { invoke: (...a: unknown[]) => invoke(...a) } },
}));
import { useCreateMember } from "./useMembers";

function setup() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return renderHook(() => useCreateMember(), { wrapper }).result;
}

describe("useCreateMember", () => {
  beforeEach(() => {
    rpc.mockReset();
    invoke.mockReset();
  });

  it("creates through the create_member RPC and sends the welcome email", async () => {
    rpc.mockResolvedValue({ data: { status: "created", id: "m1", member_no: "WT-0010" }, error: null });
    const result = setup();
    const out = await result.current.mutateAsync({ first_name: "Ada", last_name: "Lovelace", email: "ada@example.com" });

    expect(rpc).toHaveBeenCalledWith("create_member", expect.objectContaining({
      p_first_name: "Ada", p_last_name: "Lovelace", p_email: "ada@example.com",
    }));
    expect(out).toEqual({ id: "m1", member_no: "WT-0010", action: "created" });
    expect(invoke).toHaveBeenCalledWith("send-email", { body: { template: "welcome", member_id: "m1" } });
  });

  it("leaves the region to the server (callers can't pick one)", async () => {
    rpc.mockResolvedValue({ data: { status: "created", id: "m1", member_no: "WT-0010" }, error: null });
    await setup().current.mutateAsync({ first_name: "A", last_name: "B" });
    expect(rpc.mock.calls[0][1]).not.toHaveProperty("p_region_id");
  });

  it("reports an update without sending a welcome email", async () => {
    rpc.mockResolvedValue({ data: { status: "updated", id: "m2", member_no: "WT-0002" }, error: null });
    const out = await setup().current.mutateAsync({ first_name: "Emma", last_name: "Test", email: "e@example.com" });
    expect(out.action).toBe("updated");
    expect(invoke).not.toHaveBeenCalled();
  });

  it("refuses a duplicate email with the existing member's details", async () => {
    rpc.mockResolvedValue({
      data: { status: "email_exists", id: "m3", member_no: "WT-0003", first_name: "Emma", last_name: "Test -3" },
      error: null,
    });
    await expect(setup().current.mutateAsync({ first_name: "X", last_name: "Y", email: "dup@example.com" }))
      .rejects.toThrow("already exists (Emma Test -3, WT-0003)");
    expect(invoke).not.toHaveBeenCalled();
  });

  it("surfaces database errors", async () => {
    rpc.mockResolvedValue({ data: null, error: new Error("Not allowed to add members") });
    await expect(setup().current.mutateAsync({ first_name: "X", last_name: "Y" })).rejects.toThrow("Not allowed");
  });

  it("still succeeds when the welcome email fails", async () => {
    rpc.mockResolvedValue({ data: { status: "created", id: "m4", member_no: "WT-0011" }, error: null });
    invoke.mockRejectedValue(new Error("network"));
    const out = await setup().current.mutateAsync({ first_name: "A", last_name: "B", email: "a@example.com" });
    expect(out.action).toBe("created");
  });
});
