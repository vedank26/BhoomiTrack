import { CheckCircle2, CircleDashed, Clock, AlertTriangle } from "lucide-react";
import type { StatusTone } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

/**
 * Semantic status chip (spec §7.3 / UI status rules).
 * Colour is never the only carrier of meaning — every pill has text + icon.
 */
const TONE = {
  complete: {
    cls: "border-status-success/35 bg-status-success/12 text-status-success",
    Icon: CheckCircle2,
  },
  progress: {
    cls: "border-status-warning/40 bg-status-warning/14 text-status-warning",
    Icon: Clock,
  },
  issue: {
    cls: "border-status-critical/35 bg-status-critical/12 text-status-critical",
    Icon: AlertTriangle,
  },
  neutral: {
    cls: "border-border bg-muted text-muted-foreground",
    Icon: CircleDashed,
  },
} as const;

export function StatusPill({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  const { cls, Icon } = TONE[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.08em] shadow-sm",
        cls,
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {children}
    </span>
  );
}
