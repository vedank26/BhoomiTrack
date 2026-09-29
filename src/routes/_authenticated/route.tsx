import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Phase 1 protected-area gate. Every portal route lives under this layout,
 * so an unauthenticated visitor cannot reach a portal by typing its URL.
 * Role-level checks live in each child route (see requireRole).
 */
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Client-only gate: this layout is ssr:false, so during SSR/prerender there
    // is no session and no storage — skip the check and let the client enforce
    // it (avoids a hydration mismatch on direct portal loads).
    if (typeof window === "undefined") return { user: null };
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: () => <Outlet />,
});
