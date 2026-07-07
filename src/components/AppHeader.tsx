import { useState, useRef, useEffect } from "react";
import {
  View, Text, TouchableOpacity, Image, Modal, Pressable, Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useFeedbackCount } from "@/hooks/useFeedbackCount";
import { Search, MessageSquare, User, Clock, LogOut } from "lucide-react-native";

export default function AppHeader() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { feedbackCount } = useFeedbackCount();
  const [profileOpen, setProfileOpen] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const initial = user?.email?.charAt(0)?.toUpperCase() || "U";

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: profileOpen ? 1 : 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [profileOpen, fadeAnim]);

  return (
    <>
      <View className="flex-row items-center bg-primary px-3 h-14 shadow-lg" style={{ shadowColor: "rgba(122,16,48,0.22)", shadowOffset: { width: 0, height: 18 }, shadowOpacity: 1, shadowRadius: 45 }}>
        <Image source={require("@/assets/drklogo.png")} className="h-9 w-32" resizeMode="contain" />

        <View className="ml-auto flex-row items-center gap-1">
          <TouchableOpacity
            onPress={() => router.push("/feedback")}
            className="h-9 w-9 items-center justify-center rounded-full bg-white/10"
          >
            <MessageSquare size={16} color="white" />
            {feedbackCount > 0 && (
              <View className="absolute -right-0.5 -top-0.5 bg-secondary rounded-full min-w-[16px] h-[16px] items-center justify-center px-1">
                <Text className="text-white text-[9px] font-bold">{feedbackCount > 9 ? "9+" : feedbackCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/search")}
            className="h-9 w-9 items-center justify-center rounded-full bg-white/10"
          >
            <Search size={16} color="white" />
          </TouchableOpacity>

          <NotificationBell />

          <TouchableOpacity
            onPress={() => setProfileOpen(true)}
            className="h-9 w-9 items-center justify-center rounded-full bg-white/15 border border-white/15"
          >
            <Text className="text-sm font-medium text-white">{initial}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={profileOpen}
        transparent
        animationType="none"
        onRequestClose={() => setProfileOpen(false)}
      >
        <Pressable className="flex-1" onPress={() => setProfileOpen(false)}>
          <Animated.View
            className="absolute top-14 right-2 w-56 rounded-2xl bg-white shadow-lg py-1"
            style={{
              opacity: fadeAnim,
              shadowColor: "rgba(0,0,0,0.15)",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 1,
              shadowRadius: 24,
            }}
          >
            <TouchableOpacity
              className="flex-row items-center px-4 py-3"
              onPress={() => { setProfileOpen(false); router.push("/(tabs)/profile"); }}
            >
              <User size={16} color="#3F2732" />
              <Text className="text-foreground text-sm font-medium ml-3">Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center px-4 py-3"
              onPress={() => { setProfileOpen(false); router.push("/(tabs)/my-work"); }}
            >
              <Clock size={16} color="#3F2732" />
              <Text className="text-foreground text-sm font-medium ml-3">My Contributions</Text>
            </TouchableOpacity>
            <View className="h-px bg-border mx-4 my-1" />
            <TouchableOpacity
              className="flex-row items-center px-4 py-3"
              onPress={() => { setProfileOpen(false); signOut(); }}
            >
              <LogOut size={16} color="#DC2626" />
              <Text className="text-destructive text-sm font-medium ml-3">Log out</Text>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}
