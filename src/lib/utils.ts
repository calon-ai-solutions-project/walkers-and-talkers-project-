import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Where Supabase should send the user after they click a magic link /
// confirmation email. Pinned to VITE_APP_DOMAIN so a link generated from a
// local dev session still lands on the production Vercel URL. Falls back to
// the current origin (useful for local-only flows).
export function appUrl(path = "/") {
  const base =
    (import.meta.env.VITE_APP_DOMAIN as string | undefined)?.replace(
      /\/$/,
      "",
    ) ??
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}
