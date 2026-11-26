import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { getApiBaseUrl } from "./env";
import { getSupabaseClient } from "./supabase/client";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications() {
  let token: string | null = null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#7A1030",
    });
  }

  if (Platform.OS === "ios") {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      alert("Failed to get push token for push notification!");
      return null;
    }
  }

  try {
    token = (await Notifications.getExpoPushTokenAsync()).data;
  } catch (e) {
    console.warn("Push token unavailable (FCM not configured?):", e);
    return null;
  }
  return token;
}

export async function registerDeviceToken(token: string) {
  try {
    const platform = Platform.OS === "ios" ? "ios" : "android";
    const response = await fetch(`${getApiBaseUrl()}/api/push/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
      body: JSON.stringify({ platform, token }),
    });
    return response.ok;
  } catch (e) {
    console.error("Failed to register device token:", e);
    return false;
  }
}

export async function unregisterDeviceToken(token: string) {
  try {
    const platform = Platform.OS === "ios" ? "ios" : "android";
    const response = await fetch(`${getApiBaseUrl()}/api/push/token`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
      body: JSON.stringify({ platform, token }),
    });
    return response.ok;
  } catch (e) {
    console.error("Failed to unregister device token:", e);
    return false;
  }
}
