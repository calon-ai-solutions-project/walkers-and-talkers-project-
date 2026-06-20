import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export type StatColor =
  | "blue"
  | "green"
  | "violet"
  | "red"
  | "amber"
  | "cyan";

type Variant = "default" | "success" | "destructive" | "warning";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: Variant;
  color?: StatColor;
  className?: string;
}

const GRADIENT: Record<StatColor, string> = {
  blue: "linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%)",
  green: "linear-gradient(135deg, #10b981 0%, #047857 100%)",
  violet: "linear-gradient(135deg, #8b5cf6 0%, #5b21b6 100%)",
  red: "linear-gradient(135deg, #fb7185 0%, #be123c 100%)",
  amber: "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)",
  cyan: "linear-gradient(135deg, #22d3ee 0%, #0e7490 100%)",
};

const VARIANT_TO_COLOR: Record<Variant, StatColor> = {
  default: "blue",
  success: "green",
  warning: "amber",
  destructive: "red",
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "default",
  color,
  className,
}: StatCardProps) {
  const palette = color ?? VARIANT_TO_COLOR[variant];
  return (
    <div
      className={cn(
        "rounded-2xl p-6 text-white shadow-lg elevate overflow-hidden",
        className,
      )}
      style={{ backgroundImage: GRADIENT[palette] }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white/85">{title}</p>
          <p className="text-4xl font-extrabold mt-1 tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-xs text-white/80 mt-1">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shadow-inner">
            <Icon className="h-6 w-6 text-white" />
          </div>
        )}
      </div>
    </div>
  );
}
