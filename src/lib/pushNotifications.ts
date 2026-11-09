import { Platform } from "react-native";
import Constants from "expo-constants";

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    const { isDevice } = await import("expo-device");
    if (!isDevice) {
      return null;
    }

    const Notifications = await import("expo-notifications").then((m) => m);

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#7A1030",
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  } catch {
    // Push setup can throw in Expo Go on Android (notifications aren't fully
    // supported there since SDK 53) or in dev builds missing native config.
    // Degrade gracefully — push just won't work; the app continues without it.
    return null;
  }
}

export function getPushPlatform(): "ios" | "android" {
  if (Platform.OS === "ios") return "ios";
  return "android";
}
