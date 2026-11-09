import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";

export interface LockStatus {
  is_locked: boolean;
  lock_reason: string | null;
}

/**
 * Reads the current student's lock status. Used by the tab layout (to lock
 * navigation to the Upload tab) and the upload screen (to show the banner).
 *
 * staleTime: 0 so the value is always refetched on mount/focus — lock state
 * changes server-side (obligation window / admin unlock) and must be fresh.
 */
export function useLockStatus() {
  const { user, supabase } = useAuth();
  return useQuery({
    queryKey: ["lock-status", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("is_locked, lock_reason")
        .eq("auth_user_id", user!.id)
        .single();
      if (error) return { is_locked: false, lock_reason: null } as LockStatus;
      return data as LockStatus;
    },
    enabled: !!user,
    staleTime: 0,
  });
}
