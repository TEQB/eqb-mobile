import { Redirect } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Redirect href="/(tabs)/dashboard" />;
  return <Redirect href="/(auth)/login" />;
}
