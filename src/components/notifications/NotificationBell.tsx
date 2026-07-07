import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useNotifications } from "@/hooks/useNotifications";
import { Bell } from "lucide-react-native";

export function NotificationBell() {
  const router = useRouter();
  const { unreadCount } = useNotifications();

  return (
    <TouchableOpacity
      onPress={() => router.push("/notifications" as any)}
      className="relative p-2"
    >
      <Bell size={22} className="text-white" />
      {unreadCount > 0 && (
        <View className="absolute -top-0.5 -right-0.5 bg-red-500 rounded-full min-w-[18px] h-[18px] items-center justify-center px-1">
          <Text className="text-white text-[10px] font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
