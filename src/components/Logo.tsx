import { useState } from "react";
import { Footprints } from "lucide-react";

// Tries these public/ files in order, so the logo shows whether it's uploaded
// as logo.png or with its original name.
const SOURCES = [
  "/logo.png",
  "/W%26T%20Logo%202026.png", // "W&T Logo 2026.png" url-encoded
  "/wt-logo.png",
];

export function Logo({
  className,
  showWordmarkFallback = true,
}: {
  className?: string;
  showWordmarkFallback?: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const failed = idx >= SOURCES.length;

  if (failed) {
    return (
      <div className="flex items-center gap-3">
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center shadow-lg shrink-0"
          style={{
            backgroundImage:
              "linear-gradient(135deg, hsl(43 80% 58%), hsl(38 90% 48%))",
          }}
        >
          <Footprints className="h-5 w-5 text-[hsl(228_72%_24%)]" />
        </div>
        {showWordmarkFallback && (
          <span className="text-base font-extrabold tracking-tight">
            Walkers &amp; Talkers
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={SOURCES[idx]}
      alt="Walkers & Talkers"
      onError={() => setIdx((i) => i + 1)}
      className={className}
    />
  );
}
