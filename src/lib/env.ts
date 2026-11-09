import Constants from "expo-constants";

export function requireEnv(key: string): string {
  const val = Constants.expoConfig?.extra?.[key] as string | undefined;
  if (!val) throw new Error(`Missing env var: ${key}. Set it in app.json extra.`);
  return val;
}

export function getApiBaseUrl(): string {
  return (Constants.expoConfig?.extra?.EXPO_PUBLIC_API_BASE_URL as string) || "http://localhost:3000";
}

// School email domain that non-open-level registrations must use (e.g. "@tech-u.edu.ng").
// Mirrors the web app's NEXT_PUBLIC_UNIVERSITY_EMAIL_DOMAIN. May be empty.
export function getUniversityEmailDomain(): string {
  return (Constants.expoConfig?.extra?.EXPO_PUBLIC_UNIVERSITY_EMAIL_DOMAIN as string) || "";
}
