// Search and sort for the Member Directory, kept pure so it can be tested.

export type DirectoryMember = {
  member_no: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  postcode: string | null;
  city: string | null;
  created_at: string | null;
};

export type SortKey = "last_name" | "first_name" | "member_no" | "newest" | "oldest";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "last_name", label: "Last name A–Z" },
  { value: "first_name", label: "First name A–Z" },
  { value: "member_no", label: "Member number" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
];

const compact = (s: string) => s.toLowerCase().replace(/\s+/g, "");

// UK numbers are written as 07… or +44 7…; compare them the same way.
const phoneDigits = (s: string) => {
  const d = s.replace(/\D/g, "");
  return d.startsWith("44") ? "0" + d.slice(2) : d;
};

// Matches name, member number, email, postcode, town, card number and phone.
export function matchesSearch(
  m: DirectoryMember,
  query: string,
  cardTokens: string[] = [],
): boolean {
  const q = compact(query);
  if (!q) return true;
  const fields = [
    `${m.first_name} ${m.last_name ?? ""}`,
    m.member_no,
    m.email,
    m.postcode,
    m.city,
    ...cardTokens,
  ];
  if (fields.some((f) => f && compact(f).includes(q))) return true;
  const digits = phoneDigits(query);
  return digits.length >= 3 && !!m.phone && phoneDigits(m.phone).includes(digits);
}

const text = (a: string | null, b: string | null) =>
  (a ?? "").localeCompare(b ?? "", "en-GB", { sensitivity: "base", numeric: true });

// Members without a value sort after those with one.
const blankLast = (a: string | null, b: string | null) =>
  Number(!a?.trim()) - Number(!b?.trim()) || text(a, b);

const time = (iso: string | null) => (iso ? Date.parse(iso) : 0);

export function sortMembers<T extends DirectoryMember>(list: T[], key: SortKey): T[] {
  const byNo = (a: T, b: T) => text(a.member_no, b.member_no);
  const compare: Record<SortKey, (a: T, b: T) => number> = {
    last_name: (a, b) =>
      blankLast(a.last_name, b.last_name) || text(a.first_name, b.first_name) || byNo(a, b),
    first_name: (a, b) =>
      text(a.first_name, b.first_name) || blankLast(a.last_name, b.last_name) || byNo(a, b),
    member_no: byNo,
    newest: (a, b) => time(b.created_at) - time(a.created_at) || byNo(b, a),
    oldest: (a, b) => time(a.created_at) - time(b.created_at) || byNo(a, b),
  };
  return [...list].sort(compare[key]);
}
