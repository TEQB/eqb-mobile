import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";
import { LogOut, Upload, BookOpen, Clock } from "lucide-react-native";

export default function DashboardScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const supabase = getSupabaseClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, current_level, programmes(name)")
        .eq("auth_user_id", user!.id)
        .single();
      if (error) throw error;
      return data as Record<string, any>;
    },
    enabled: !!user,
  });

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-6 pt-14 pb-6">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-gray-500 text-sm">Welcome back,</Text>
            {isLoading ? (
              <ActivityIndicator size="small" />
            ) : (
              <Text className="text-2xl font-bold text-gray-900">{profile?.full_name || "Student"}</Text>
            )}
          </View>
          <TouchableOpacity onPress={signOut} className="p-2">
            <LogOut size={22} color="#6B7280" />
          </TouchableOpacity>
        </View>
        {profile?.programmes?.name && (
          <Text className="text-gray-500 mt-1">
            {profile.programmes.name} · Level {profile.current_level}
          </Text>
        )}
      </View>

      <View className="px-6 pt-6">
        <TouchableOpacity
          className="bg-primary py-4 rounded-xl items-center mb-4 flex-row justify-center"
          onPress={() => router.push("/upload")}
        >
          <Upload size={20} color="white" />
          <Text className="text-white font-semibold text-base ml-2">Upload Past Question</Text>
        </TouchableOpacity>

        <View className="flex-row gap-3">
          <TouchableOpacity
            className="flex-1 bg-white p-4 rounded-xl items-center"
            onPress={() => router.push("/(tabs)/browse")}
          >
            <BookOpen size={28} color="#DC2626" />
            <Text className="text-gray-700 font-medium mt-2">Browse</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-white p-4 rounded-xl items-center"
            onPress={() => router.push("/contributions")}
          >
            <Clock size={28} color="#DC2626" />
            <Text className="text-gray-700 font-medium mt-2">My Uploads</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
