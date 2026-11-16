import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useLockStatus } from "./useLockStatus";

/**
 * Redirects locked users to the upload screen when they try to access
 * a screen that should be blocked. Use this on deep-link screens
 * (question, course, group, etc.) that are not the upload screen.
 *
 * The tab layout already handles tab-level locking; this hook handles
 * deep links that bypass the tab navigator.
 */
export function useLockGuard() {
  const router = useRouter();
  const { data: lockInfo, isLoading } = useLockStatus();

  useEffect(() => {
    if (!isLoading && lockInfo?.is_locked) {
      router.replace("/(tabs)/upload");
    }
  }, [isLoading, lockInfo?.is_locked, router]);

  return { isLocked: !!lockInfo?.is_locked, isLoading };
}
