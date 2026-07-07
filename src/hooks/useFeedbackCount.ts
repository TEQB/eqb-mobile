import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { getSupabaseClient } from "@/lib/supabase/client";

export function useFeedbackCount() {
  const { user } = useAuth();
  const supabase = getSupabaseClient();
  const [feedbackCount, setFeedbackCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (profile) {
      const { count } = await supabase
        .from("feedback_messages")
        .select("*", { count: "exact", head: true })
        .eq("user_id", (profile as any).id)
        .eq("is_read", false);
      setFeedbackCount(count ?? 0);
    }
  }, [user, supabase]);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  return { feedbackCount, refresh: fetchCount };
}
