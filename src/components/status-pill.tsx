import type { GradeLevel } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

const STYLES: Record<GradeLevel, string> = {
  green: "bg-pine-bg text-pine",
  amber: "bg-amber-bg text-amber",
  red: "bg-signal-bg text-signal",
};

export function StatusPill({ level, label }: { level: GradeLevel; label: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", STYLES[level])}>
      <span className={cn("h-1.5 w-1.5 rounded-full", level === "green" ? "bg-pine" : level === "amber" ? "bg-amber" : "bg-signal")} />
      {label}
    </span>
  );
}
