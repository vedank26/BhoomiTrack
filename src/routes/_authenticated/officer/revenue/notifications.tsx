import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";

export const Route = createFileRoute("/_authenticated/officer/revenue/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications & Declaration — Land Acquisition" },
      {
        name: "description",
        content:
          "Availability of case-linked statutory notification records for the Land Acquisition workflow.",
      },
    ],
  }),
  component: RevenueNotificationsPage,
});

function RevenueNotificationsPage() {
  return (
    <AppShell portal="officer" department="land_acquisition">
      <PageHeader
        eyebrow="Land Acquisition · Notifications"
        title="Notifications & Declaration"
        description="Case-linked notification records are shown only when an authoritative source is available."
      />

      <div className="mt-6 surface-panel border border-border p-5">
        <h2 className="text-sm font-semibold text-foreground">Notification records unavailable</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          No authoritative case-linked notification source is currently available. No notification
          references, publication dates, remarks, or statuses are shown.
        </p>
      </div>
    </AppShell>
  );
}
