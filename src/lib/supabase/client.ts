import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { SecureStoreAdapter } from "./secure-store";
import Constants from "expo-constants";

const supabaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

let client: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseClient() {
  if (!client) {
    client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: SecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
