import { useEffect } from "react";
import { Alert } from "react-native";
import { Tabs, useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Updates from "expo-updates";
import { Home, Search, Upload, FileText, User, MessageCircle } from "lucide-react-native";
import AppHeader from "@/components/AppHeader";
import { Announcements } from "@/components/Announcements";
import { useLockStatus } from "@/hooks/useLockStatus";

export default function TabLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { data } = useLockStatus();
  const isLocked = !!data?.is_locked;
  const insets = useSafeAreaInsets();

  // Check for OTA updates on mount
  useEffect(() => {
    (async () => {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          Alert.alert(
            "Update available",
            "A new version of the app is ready. Install now?",
            [
              { text: "Later", style: "cancel" },
              {
                text: "Update now",
                onPress: async () => {
                  await Updates.fetchUpdateAsync();
                  await Updates.reloadAsync();
                },
              },
            ],
          );
        }
      } catch {
        // Non-fatal: update check may fail in dev or with certain configurations
      }
    })();
  }, []);

  // When locked, force the student onto the Upload tab. The tabPress listeners
  // below block switching away from Upload; this redirect catches the initial
  // load (and deep links) and bounces them back to Upload.
  useEffect(() => {
    if (isLocked && pathname && !pathname.startsWith("/upload")) {
      router.replace("/(tabs)/upload");
    }
  }, [isLocked, pathname, router]);

  // Prevent tapping a non-Upload tab while locked (keeps the user on Upload).
  const blockIfLocked = {
    tabPress: (e: { preventDefault: () => void }) => {
      if (isLocked) e.preventDefault();
    },
  };

  return (
    <>
    <Tabs
      screenOptions={{
        header: () => <AppHeader />,
        tabBarActiveTintColor: "#7A1030",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          backgroundColor: "#FFFDFB",
          borderTopWidth: 1,
          borderTopColor: "#E5D7D0",
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          height: 68 + (insets.bottom > 0 ? insets.bottom : 0),
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="home/index"
        listeners={blockIfLocked}
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }: any) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="browse/index"
        listeners={blockIfLocked}
        options={{
          title: "Browse",
          tabBarIcon: ({ color, size }: any) => <Search color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="upload/index"
        options={{
          title: "Upload",
          tabBarIcon: ({ color, size }: any) => <Upload color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="my-work/index"
        listeners={blockIfLocked}
        options={{
          title: "My Work",
          tabBarIcon: ({ color, size }: any) => <FileText color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="groups/index"
        listeners={blockIfLocked}
        options={{
          title: "Groups",
          tabBarIcon: ({ color, size }: any) => <MessageCircle color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile/index"
        listeners={blockIfLocked}
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }: any) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
    <Announcements />
    </>
  );
}
