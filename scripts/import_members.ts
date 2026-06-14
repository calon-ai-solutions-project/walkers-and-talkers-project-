/**
 * One-off member import. Run locally, never in the browser or CI.
 *
 *   npm run import:members -- ./WT_Consolidated_Members.xlsx
 *
 * Reads two sheets ("Full Data Members" and "Name and Email Only"), inserts
 * members in batches, then creates one card with a unique 12-char token per
 * member.
 *
 * This script uses the service_role key (bypasses RLS). It reads it from
 * .env.local and it must NEVER be imported into anything under src/.
 */
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { randomBytes } from "node:crypto";
import { config } from "dotenv";
import path from "node:path";
import type { Database } from "../src/types/database";

// Load env from .env.local (gitignored).
config({ path: path.resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error(
    "Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
      "Add SUPABASE_SERVICE_ROLE_KEY to .env.local (do not commit it)."
  );
  process.exit(1);
}

const supabase = createClient<Database>(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

type MemberInsert = Database["public"]["Tables"]["members"]["Insert"];

function token(): string {
  return randomBytes(9)
    .toString("base64")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 12);
}

async function insertInBatches<T>(
  label: string,
  rows: T[],
  insert: (batch: T[]) => PromiseLike<{ error: { message: string } | null }>
) {
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const { error } = await insert(batch);
    if (error) {
      console.error(`${label} batch starting at ${i} failed:`, error.message);
      throw new Error(error.message);
    }
    console.log(`${label}: ${i + batch.length} / ${rows.length}`);
  }
}

async function main() {
  const { data: bristol, error: regionErr } = await supabase
    .from("regions")
    .select("id")
    .eq("slug", "bristol")
    .single();
  if (regionErr || !bristol) {
    throw regionErr ?? new Error("Bristol region not seeded — run seed.sql.");
  }
  const bristolId = bristol.id;

  const xlsxPath = process.argv[2] ?? "./WT_Consolidated_Members.xlsx";
  console.log(`Reading ${xlsxPath}`);
  const wb = XLSX.readFile(xlsxPath);

  function sheetRows(name: string): unknown[][] {
    const sheet = wb.Sheets[name];
    if (!sheet) {
      throw new Error(`Expected a sheet named "${name}".`);
    }
    // header:1 → array of arrays, matching the column-index access below.
    return XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
  }

  const fullData = sheetRows("Full Data Members");
  const partialData = sheetRows("Name and Email Only");

  // NOTE: adjust column indexes if the xlsx layout differs.
  const fullRows: MemberInsert[] = fullData.slice(1).map(
    (row) => ({
      member_no: String(row[0] ?? ""),
      first_name: String(row[1] ?? ""),
      last_name: String(row[2] ?? ""),
      email: (row[3] as string) || null,
      phone: (row[4] as string) || null,
      address_line1: (row[5] as string) || null,
      city: (row[6] as string) || null,
      postcode: (row[7] as string) || null,
      region_id: bristolId,
      member_since_year: 2024,
      needs_full_data: false,
      data_source: "paper_form_v1",
      active: true,
    })
  );

  const partialRows: MemberInsert[] = partialData.slice(1).map(
    (row) => ({
      member_no: String(row[0] ?? ""),
      first_name: String(row[1] ?? ""),
      last_name: String(row[2] ?? ""),
      email: (row[3] as string) || null,
      region_id: bristolId,
      member_since_year: 2024,
      needs_full_data: true,
      data_source: "mailing_list",
      active: true,
    })
  );

  const all = [...fullRows, ...partialRows].filter(
    (m) => m.member_no && m.first_name && m.last_name
  );

  console.log(
    `Importing ${all.length} members (full ${fullRows.length}, partial ${partialRows.length})`
  );

  await insertInBatches("Members", all, (batch) =>
    supabase.from("members").insert(batch)
  );

  // Fetch inserted member ids to attach one card each.
  const { data: members, error: fetchErr } = await supabase
    .from("members")
    .select("id, member_no");
  if (fetchErr || !members) throw fetchErr ?? new Error("Member refetch failed");

  const cards = members.map((m) => ({
    member_id: m.id,
    token: token(),
    state: "pending" as const,
  }));

  // Sanity check token uniqueness before inserting.
  const unique = new Set(cards.map((c) => c.token));
  if (unique.size !== cards.length) {
    throw new Error(
      `Token collision: ${cards.length - unique.size} duplicate(s). Re-run.`
    );
  }

  await insertInBatches("Cards", cards, (batch) =>
    supabase.from("cards").insert(batch)
  );

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
