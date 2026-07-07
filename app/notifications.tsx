import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { Bell, ChevronLeft } from "lucide-react-native";

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications();

  const handlePress = async (notification: any) => {
    if (!notification.is_read) await markRead(notification.id);
    if (notification.link) {
      router.push(notification.link as any);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-6 pt-14 pb-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity onPress={() => router.back()}>
              <ChevronLeft size={24} color="#111827" />
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-gray-900">Notifications</Text>
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllRead}>
              <Text className="text-sm font-medium text-primary">Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" className="mt-10" />
      ) : (
        <FlatList
          className="px-4 pt-2"
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <View className="items-center mt-20">
              <Bell size={40} color="#D1D5DB" />
              <Text className="text-gray-500">No notifications yet</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handlePress(item)}
              className={cn(
                "flex-row items-start gap-3 bg-white p-4 rounded-xl mb-2",
                !item.is_read && "border-l-4 border-primary",
              )}
            >
              <View
                className={cn(
                  "w-2.5 h-2.5 rounded-full mt-1.5",
                  item.is_read ? "bg-transparent" : "bg-primary",
                )}
              />
              <View className="flex-1">
                <Text
                  className={cn(
                    "text-sm",
                    item.is_read ? "text-gray-700" : "font-semibold text-gray-900",
                  )}
                >
                  {item.title}
                </Text>
                {item.body && (
                  <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={2}>
                    {item.body}
                  </Text>
                )}
                <Text className="text-[11px] text-gray-400 mt-1">
                  {item.created_at
                    ? new Date(item.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
