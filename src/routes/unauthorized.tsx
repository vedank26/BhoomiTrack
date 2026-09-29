import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { ROLE_META } from "@/lib/domain";

export const Route = createFileRoute("/unauthorized")({
  head: () => ({
    meta: [
      { title: "Access not permitted — BhoomiTrack" },
      {
        name: "description",
        content:
          "Your account role does not permit access to this portal of the BhoomiTrack platform.",
      },
      { property: "og:title", content: "Access not permitted — BhoomiTrack" },
      {
        property: "og:description",
        content: "Role-based access control blocked this portal request.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UnauthorizedPage,
});

function UnauthorizedPage() {
  const { t } = useI18n();
  const { role, user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <AppShell>
      <div className="mx-auto max-w-xl surface-panel p-8 text-center">
        <h1 className="font-serif text-2xl font-bold">{t("auth.unauthorized")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {t("auth.unauthorizedBody")}
        </p>
        {user ? (
          <p className="mt-4 text-sm">
            <span className="font-semibold">{user.email}</span>
            {role ? (
              <span className="ml-2 rounded border border-border bg-muted px-2 py-0.5 text-xs font-semibold">
                {ROLE_META[role].label}
              </span>
            ) : null}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {role ? (
            <Link
              to={ROLE_META[role].home}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              {t("auth.goToMyPortal")}
            </Link>
          ) : null}
          <button
            type="button"
            onClick={async () => {
              await signOut();
              navigate({ to: "/auth", replace: true });
            }}
            className="rounded-md border border-border px-4 py-2 text-sm font-semibold"
          >
            {t("auth.signOut")}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
