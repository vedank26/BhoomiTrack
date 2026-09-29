import { DATA_CLASSES, type DataClass } from "@/lib/domain";

const TONE: Record<DataClass, string> = {
  real_public_aggregate: "bg-class-real/12 text-class-real border-class-real/30",
  representative:
    "bg-class-representative/12 text-class-representative border-class-representative/30",
  synthetic: "bg-class-synthetic/15 text-class-synthetic border-class-synthetic/35",
  authorized_integration: "bg-muted text-muted-foreground border-border",
};

/** Provenance chip. Every dataset surfaced in the UI must carry one (spec §7.3). */
export function DataClassBadge({
  dataClass,
  className = "",
}: {
  dataClass: DataClass;
  className?: string;
}) {
  const meta = DATA_CLASSES[dataClass];
  return (
    <span
      title={meta.note}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wide ${TONE[dataClass]} ${className}`}
    >
      {meta.short}
    </span>
  );
}
