import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const profileNameQueryKey = (userId: string | undefined) =>
  ["survey", "current-profile-name", userId] as const;

export function useSurveyActorName() {
  const { user } = useAuth();
  const userId = user?.id;
  const profileQuery = useQuery({
    queryKey: profileNameQueryKey(userId),
    enabled: Boolean(userId),
    retry: false,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .maybeSingle();
      if (error) return null;
      return data?.full_name?.trim() || null;
    },
  });

  return useCallback(
    (actorId: string | null | undefined): string => {
      if (!actorId || actorId !== userId) return "Officer";
      return profileQuery.data || user?.email || "Officer";
    },
    [profileQuery.data, user?.email, userId],
  );
}
