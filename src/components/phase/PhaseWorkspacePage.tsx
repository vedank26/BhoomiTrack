import { Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { DataClassBadge } from "@/components/layout/DataClassBadge";
import { PageHeader, Section } from "@/components/layout/PageHeader";
import { StatusPill } from "@/components/ui/status-pill";
import { ROLE_META, type Role } from "@/lib/domain";
import { PORTAL_NAV } from "@/lib/navigation";

const STARTER_ACTIONS = [
  "Review available demonstration data",
  "Add the first workflow action",
  "Connect the authoritative API or table",
] as const;

export function PhaseWorkspacePage({
  portal,
  workspace,
}: {
  portal: Role;
  workspace: string;
}) {
  const item = PORTAL_NAV[portal]
    .flatMap((group) => group.items)
    .find((navItem) => navItem.key === workspace);

  const title = item?.label ?? "Workspace";
  const phase = item?.phase ?? "Starter";

  return (
    <AppShell portal={portal}>
      <PageHeader
        eyebrow={`${ROLE_META[portal].label} / ${phase}`}
        title={title}
        description="This phase is unlocked as a basic workspace so the team can start adding real screens, forms, integrations and workflow rules here."
        actions={<DataClassBadge dataClass="synthetic" />}
      />

      <Section
        title="Starter workspace"
        description="A lightweight shell is available now. Replace these panels as each phase becomes feature complete."
      >
        <div className="grid gap-3 lg:grid-cols-3">
          {STARTER_ACTIONS.map((action, index) => (
            <article key={action} className="surface-panel p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Step {index + 1}
              </p>
              <h3 className="mt-2 text-sm font-semibold">{action}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Use this area as the first working surface for {title.toLowerCase()}.
              </p>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Current status">
        <div className="surface-panel grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{phase} access enabled</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Navigation is active and the page is reachable. Detailed
              validation, database writes and role-specific task flows can now
              be implemented incrementally.
            </p>
          </div>
          <StatusPill tone="progress">Unlocked</StatusPill>
        </div>
      </Section>

      <Section title="Return">
        <Link
          to={ROLE_META[portal].home}
          className="inline-flex rounded-md border border-border px-3 py-2 text-sm font-semibold transition-colors hover:bg-secondary"
        >
          Back to {ROLE_META[portal].label}
        </Link>
      </Section>
    </AppShell>
  );
}
