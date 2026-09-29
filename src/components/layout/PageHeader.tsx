import type { ReactNode } from "react";

/**
 * Standard page hierarchy: title → short explanation → primary action/status.
 * Every portal page uses this so headings stay consistent and semantic.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)] gap-4 border-b border-border pb-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-2 font-serif text-2xl font-bold leading-tight text-foreground md:text-[2.1rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-[0.96rem]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">{actions}</div> : null}
    </header>
  );
}

/** Titled content block used across all three portals. */
export function Section({
  title,
  description,
  aside,
  children,
}: {
  title: string;
  description?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mt-8">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h2 className="min-w-0 font-serif text-lg font-semibold">{title}</h2>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
      {description ? (
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Compact KPI tile. Value first, label second, optional footnote. */
export function MetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <article className="surface-panel p-4">
      <p className="font-serif text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{label}</p>
      {note ? <p className="mt-1 text-xs text-muted-foreground">{note}</p> : null}
    </article>
  );
}
