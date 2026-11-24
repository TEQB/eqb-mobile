import { useEffect } from "react";
import { useRouter } from "expo-router";
import { mapNotificationLink } from "@/lib/notificationLinks";

/**
 * Handles taps on push notifications: maps the web link carried in the
 * notification payload to a mobile route and navigates there.
 * Also covers cold starts (app opened by tapping a notification while killed).
 */
export function PushNotificationHandler() {
  const router = useRouter();

  useEffect(() => {
    let subscription: { remove: () => void } | null = null;
    let mounted = true;

    const navigate = (rawLink: unknown) => {
      if (typeof rawLink !== "string" || !rawLink) return;
      let link = rawLink;
      // Server may send a full URL — reduce to its path
      if (link.startsWith("http")) {
        try {
          link = new URL(link).pathname;
        } catch {
          return;
        }
      }
      const route = mapNotificationLink(link);
      if (route) {
        router.push(route as never);
      }
    };

    (async () => {
      try {
        const Notifications = await import("expo-notifications");

        // Cold start: app was launched by tapping a notification
        const last = await Notifications.getLastNotificationResponseAsync();
        if (mounted && last) {
          const data = last.notification.request.content.data as { link?: string };
          navigate(data?.link);
        }

        subscription = Notifications.addNotificationResponseReceivedListener(
          (response) => {
            const data = response.notification.request.content.data as { link?: string };
            navigate(data?.link);
          },
        );
      } catch {
        // expo-notifications unavailable (e.g. Expo Go on Android)
      }
    })();

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, [router]);

  return null;
}
