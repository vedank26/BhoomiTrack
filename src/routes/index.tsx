import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { DataClassBadge } from "@/components/layout/DataClassBadge";
import { APP, CASE_STAGES, ROLES, ROLE_META } from "@/lib/domain";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "BhoomiTrack — Integrated Land Acquisition & Management Platform",
      },
      {
        name: "description",
        content:
          "BhoomiTrack is a parcel-centric land acquisition platform linking GIS, workflow, decision support, compensation and citizen transparency in one traceable case.",
      },
      {
        property: "og:title",
        content: "BhoomiTrack — Integrated Land Acquisition & Management Platform",
      },
      {
        property: "og:description",
        content:
          "One parcel, one acquisition case, one traceable lifecycle — officer, ministry and landowner portals in a single platform.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const PORTAL_ACCENT = {
  officer: "border-t-portal-officer",
  ministry: "border-t-portal-ministry",
  citizen: "border-t-portal-citizen",
} as const;

function Landing() {
  const { t } = useI18n();

  return (
    <AppShell>
      <section className="rounded-xl border border-border bg-card p-8 md:p-12">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {APP.code} · {APP.specVersion}
        </p>
        <h1 className="mt-3 max-w-4xl font-serif text-3xl font-bold leading-tight md:text-5xl">
          {t("landing.title")}
        </h1>
        <p className="mt-4 max-w-3xl text-base text-muted-foreground md:text-lg">
          {t("landing.subtitle")}
        </p>
        <p className="mt-6 inline-block rounded-md border-l-4 border-saffron bg-secondary px-4 py-2 font-serif text-lg">
          {t("app.tagline")}
        </p>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-xl font-semibold">
          {t("landing.choose")}
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {ROLES.map((role) => (
            <Link
              key={role}
              to={ROLE_META[role].home}
              className={`surface-panel border-t-4 ${PORTAL_ACCENT[role]} p-6 transition-shadow hover:shadow-lg`}
            >
              <h3 className="font-serif text-lg font-semibold">
                {t(`nav.${role}`)}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {ROLE_META[role].purpose}
              </p>
              <span className="mt-4 inline-block text-sm font-semibold text-primary">
                {t("common.openPortal")} →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-serif text-xl font-semibold">
            Configured demo workflow — National Highway path
          </h2>
          <DataClassBadge dataClass="representative" />
        </div>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          The workflow engine is configurable by project type and governing
          framework. The sequence below is one configured path used for the
          prototype demonstration, not a universal legal order.
        </p>
        <ol className="mt-4 flex flex-wrap gap-2">
          {CASE_STAGES.map((stage, i) => (
            <li
              key={stage.key}
              className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm"
            >
              <span className="grid size-6 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                {i + 1}
              </span>
              <span className="font-medium">{stage.label}</span>
              {stage.code !== "—" ? (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[0.68rem] font-semibold text-muted-foreground">
                  {stage.code}
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12 grid gap-4 md:grid-cols-3">
        {[
          {
            title: "GIS is first class",
            body: "Project alignment and cadastral parcels are intersected to identify affected parcels and affected area. GIS never overwrites an authoritative land record — it flags discrepancies for human verification.",
          },
          {
            title: "AI supports, humans decide",
            body: "Anomaly detection, objection classification, delay risk and impact concentration — each result carries evidence, confidence and a model or rule version. No legal or ownership decision is automated.",
          },
          {
            title: "Labelled data provenance",
            body: "Every dataset is marked as real public aggregate, representative or synthetic. The prototype never presents fabricated information as an official government record.",
          },
        ].map((card) => (
          <article key={card.title} className="surface-panel p-6">
            <h3 className="font-serif text-lg font-semibold">{card.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{card.body}</p>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
