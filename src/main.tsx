import { createRoot } from "react-dom/client";
import "./index.css";

const root = createRoot(document.getElementById("root")!);

// The Supabase client throws at import time when these are missing, which
// leaves a blank white page with no clue why. Check first and say so.
const missing = [
  !import.meta.env.VITE_SUPABASE_URL && "VITE_SUPABASE_URL",
  !(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) &&
    "VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY)",
].filter(Boolean) as string[];

if (missing.length) {
  root.render(
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md space-y-3 text-center">
        <h1 className="text-xl font-semibold">This site isn't configured yet</h1>
        <p className="text-sm text-muted-foreground">
          These environment variables were not set when the app was built:
        </p>
        <ul className="text-sm font-mono">
          {missing.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          Add them (locally in <code>.env.local</code>, on Vercel under Project → Settings →
          Environment Variables) and rebuild.
        </p>
      </div>
    </main>,
  );
} else {
  import("./App.tsx").then(({ default: App }) => root.render(<App />));
}
