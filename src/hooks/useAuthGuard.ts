import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";

export function useAuthGuard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/(auth)/login");
    }
  }, [user, loading, router]);

  return { isAuthenticated: !!user, isLoading: loading };
}
