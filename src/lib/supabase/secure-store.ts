import * as SecureStore from "expo-secure-store";
import type { SupportedStorage } from "@supabase/supabase-js";

export const SecureStoreAdapter: SupportedStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};
