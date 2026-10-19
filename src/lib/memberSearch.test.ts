import { describe, expect, it } from "vitest";
import { matchesSearch, sortMembers, type DirectoryMember } from "./memberSearch";

function member(over: Partial<DirectoryMember>): DirectoryMember {
  return {
    member_no: "WT-0001",
    first_name: "Ann",
    last_name: "Smith",
    email: null,
    phone: null,
    postcode: null,
    city: null,
    created_at: null,
    ...over,
  };
}

describe("matchesSearch", () => {
  const m = member({
    first_name: "Royston",
    last_name: "HAMILTON",
    member_no: "WT-0002",
    email: "roy@example.com",
    phone: "07902 202303",
    postcode: "BS5 7QL",
    city: "Bristol",
  });

  it("matches everything for an empty query", () => {
    expect(matchesSearch(m, "  ")).toBe(true);
  });

  it("matches full name, ignoring case and spaces", () => {
    expect(matchesSearch(m, "royston ham")).toBe(true);
    expect(matchesSearch(m, "hamilton")).toBe(true);
  });

  it("matches member number, email, postcode and town", () => {
    expect(matchesSearch(m, "wt-0002")).toBe(true);
    expect(matchesSearch(m, "roy@example")).toBe(true);
    expect(matchesSearch(m, "bs57ql")).toBe(true);
    expect(matchesSearch(m, "bristol")).toBe(true);
  });

  it("matches phone numbers however they are typed", () => {
    expect(matchesSearch(m, "202303")).toBe(true);
    expect(matchesSearch(m, "07902202303")).toBe(true);
    expect(matchesSearch(m, "+44 7902 202303")).toBe(true);
    expect(matchesSearch(m, "12")).toBe(false);
  });

  it("matches card numbers", () => {
    expect(matchesSearch(m, "cj7qhh", ["cj7qhhnztdly"])).toBe(true);
    expect(matchesSearch(m, "cj7qhh")).toBe(false);
  });

  it("does not match unrelated text", () => {
    expect(matchesSearch(m, "nigel")).toBe(false);
  });
});

describe("sortMembers", () => {
  const list = [
    member({ member_no: "WT-NE-0002", first_name: "bob", last_name: "", created_at: "2026-10-19T10:00:00Z" }),
    member({ member_no: "WT-0010", first_name: "Cara", last_name: "adams", created_at: "2026-10-20T09:00:00Z" }),
    member({ member_no: "WT-0002", first_name: "Alan", last_name: "Zed", created_at: "2026-10-18T09:00:00Z" }),
  ];
  const nos = (l: DirectoryMember[]) => l.map((m) => m.member_no);

  it("sorts by last name, case-insensitively, blanks last", () => {
    expect(nos(sortMembers(list, "last_name"))).toEqual(["WT-0010", "WT-0002", "WT-NE-0002"]);
  });

  it("sorts by first name", () => {
    expect(nos(sortMembers(list, "first_name"))).toEqual(["WT-0002", "WT-NE-0002", "WT-0010"]);
  });

  it("sorts member numbers numerically", () => {
    expect(nos(sortMembers(list, "member_no"))).toEqual(["WT-0002", "WT-0010", "WT-NE-0002"]);
  });

  it("sorts newest and oldest by when they were added", () => {
    expect(nos(sortMembers(list, "newest"))).toEqual(["WT-0010", "WT-NE-0002", "WT-0002"]);
    expect(nos(sortMembers(list, "oldest"))).toEqual(["WT-0002", "WT-NE-0002", "WT-0010"]);
  });

  it("does not change the input array", () => {
    const before = nos(list);
    sortMembers(list, "member_no");
    expect(nos(list)).toEqual(before);
  });
});
