import { Tabs } from "expo-router";
import { Home, BookOpen, Compass, User } from "lucide-react-native";
import { NotificationBell } from "@/components/notifications/NotificationBell";

function HeaderRight() {
  return <NotificationBell />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#DC2626",
        tabBarInactiveTintColor: "#9CA3AF",
        headerStyle: { backgroundColor: "#DC2626" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
        headerRight: () => <HeaderRight />,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: "#E5E7EB",
          paddingBottom: 4,
          height: 56,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          title: "Browse",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <BookOpen size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <Compass size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
