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
 * Timed locks (lock_expires_at) are treated as unlocked once expired.
 */
export function useLockStatus() {
  const { user, supabase } = useAuth();
  return useQuery({
    queryKey: ["lock-status", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("is_locked, lock_reason, lock_expires_at")
        .eq("auth_user_id", user!.id)
        .single();
      if (error) return { is_locked: false, lock_reason: null } as LockStatus;
      const row = data as {
        is_locked: boolean;
        lock_reason: string | null;
        lock_expires_at: string | null;
      };
      const expired =
        row.lock_expires_at != null &&
        new Date(row.lock_expires_at).getTime() <= Date.now();
      return {
        is_locked: row.is_locked && !expired,
        lock_reason: row.lock_reason,
      } as LockStatus;
    },
    enabled: !!user,
    staleTime: 0,
  });
}
