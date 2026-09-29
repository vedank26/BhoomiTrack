import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Phase 2 connectivity check only.
 *
 * Reads row counts through the RLS-protected Data API so we can confirm the
 * live database connection and that the caller's role policies apply. No CRUD
 * screens are built in this phase.
 */
async function fetchCounts() {
  const tables = ["projects", "parcels", "acquisition_cases"] as const;
  const results = await Promise.all(
    tables.map(async (table) => {
      const { count, error } = await supabase
        .from(table)
        .select("id", { count: "exact", head: true });
      return { table, count: error ? null : (count ?? 0), error: error?.message ?? null };
    }),
  );
  return results;
}

const LABELS: Record<string, string> = {
  projects: "Projects visible",
  parcels: "Parcels visible",
  acquisition_cases: "Cases visible",
};

export function DbStatusPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["phase2-db-status"],
    queryFn: fetchCounts,
  });

  if (isLoading) {
    return (
      <p className="surface-panel p-4 text-sm text-muted-foreground">
        Checking database connection…
      </p>
    );
  }

  if (error) {
    return (
      <p className="surface-panel p-4 text-sm text-destructive">
        Database unreachable: {(error as Error).message}
      </p>
    );
  }

  return (
    <dl className="surface-panel grid gap-4 p-4 sm:grid-cols-3">
      {data?.map((row) => (
        <div key={row.table}>
          <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {LABELS[row.table]}
          </dt>
          <dd className="mt-1 text-sm font-medium">
            {row.count === null ? `Blocked by policy (${row.error})` : row.count}
          </dd>
        </div>
      ))}
    </dl>
  );
}
