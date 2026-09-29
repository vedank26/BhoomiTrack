import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, CircleHelp, Phone } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Section } from "@/components/layout/PageHeader";
import {
  CitizenCaseContext,
  CitizenCaseState,
  useCitizenCase,
} from "@/lib/shared-case/citizen-case";

const helpTopics = [
  {
    title: "What is the objection window?",
    detail:
      "This is the statutory period during which affected landowners can raise objections or clarifications on the notified parcel and affected extent.",
  },
  {
    title: "What do I need to check?",
    detail:
      "Review your parcel number, affected area, current stage and the documents uploaded for your case before taking any next step.",
  },
  {
    title: "How do I get assistance?",
    detail:
      "Use the official support helpline or visit the local acquisition office with your ID and title documents for verification.",
  },
];

export const Route = createFileRoute("/_authenticated/citizen/help")({
  head: () => ({
    meta: [
      { title: "Help — Citizen Portal" },
      {
        name: "description",
        content: "Citizen help and support information for the land acquisition process.",
      },
    ],
  }),
  component: CitizenHelpPage,
});

function CitizenHelpPage() {
  const query = useCitizenCase();
  const caseData = query.data?.selected ?? null;

  return (
    <AppShell portal="citizen">
      <PageHeader
        eyebrow="Citizen"
        title="Help & Support"
        description="Guidance for common rights, procedures and support questions related to the land acquisition process."
      />

      <CitizenCaseState loading={query.isLoading} error={query.error} caseData={caseData} />
      {caseData ? <CitizenCaseContext caseData={caseData} /> : null}

      <Section
        title="Frequently asked questions"
        description="Key guidance for citizens during the acquisition process."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {helpTopics.map((topic) => (
            <article key={topic.title} className="surface-panel p-4">
              <div className="flex items-center gap-2 text-primary">
                <CircleHelp className="size-4" />
                <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                  Guidance
                </p>
              </div>
              <h3 className="mt-3 text-base font-bold text-foreground">{topic.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{topic.detail}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Support contact" description="Citizen support information.">
        <div className="surface-panel p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-full bg-secondary text-primary">
                <Phone className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Citizen help desk</p>
                <p className="text-xs text-muted-foreground">
                  Toll free support and local office guidance
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <BookOpen className="size-4 text-primary" />
              1800-526-3435
            </div>
          </div>
        </div>
      </Section>
    </AppShell>
  );
}
