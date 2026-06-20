import { useState } from "react";
import { Footprints } from "lucide-react";

/**
 * Renders the brand logo from /logo.png (place your file at public/logo.png).
 * Falls back to a gold footprints mark + wordmark until the image is added,
 * so the UI never breaks.
 */
export function Logo({
  className,
  showWordmarkFallback = true,
}: {
  className?: string;
  showWordmarkFallback?: boolean;
}) {
  const [failed, setFailed] = useState(false);

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
      src="/logo.png"
      alt="Walkers & Talkers"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
