import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: "default" | "success" | "destructive" | "warning";
  className?: string;
}

const accentBar = {
  default: "before:bg-primary",
  success: "before:bg-success",
  destructive: "before:bg-destructive",
  warning: "before:bg-warning",
};

const iconChip = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  destructive: "bg-destructive/10 text-destructive",
  warning: "bg-warning/10 text-warning",
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "default",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "stat-card relative overflow-hidden",
        "before:content-[''] before:absolute before:left-0 before:top-0 before:h-full before:w-1.5",
        accentBar[variant],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 pl-1.5">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-4xl font-extrabold mt-1 tracking-tight text-foreground">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center shadow-sm",
              iconChip[variant],
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
        )}
      </div>
    </div>
  );
}
