import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Clock, MessageSquare, LogOut, ChevronRight, User } from "lucide-react-native";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const supabase = getSupabaseClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, matric_number, current_level, programmes(name)")
        .eq("auth_user_id", user!.id)
        .single();
      if (error) throw error;
      return data as Record<string, any>;
    },
    enabled: !!user,
  });

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="bg-white px-6 pt-14 pb-6 items-center">
        <View className="w-20 h-20 bg-primary rounded-full items-center justify-center mb-3">
          <Text className="text-3xl font-bold text-white">
            {((profile?.full_name as string)?.charAt(0)) || "S"}
          </Text>
        </View>
        {isLoading ? (
          <ActivityIndicator />
        ) : (
          <>
            <Text className="text-xl font-bold text-gray-900">{profile?.full_name as string}</Text>
            <Text className="text-gray-500">{profile?.matric_number as string}</Text>
          </>
        )}
      </View>

      <View className="px-6 pt-6">
        <TouchableOpacity
          className="bg-white p-4 rounded-xl flex-row items-center mb-3"
          onPress={() => router.push("/contributions")}
        >
          <Clock size={22} color="#DC2626" />
          <Text className="flex-1 text-gray-800 font-medium ml-3">My Contributions</Text>
          <ChevronRight size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-white p-4 rounded-xl flex-row items-center mb-3"
          onPress={() => router.push("/feedback")}
        >
          <MessageSquare size={22} color="#DC2626" />
          <Text className="flex-1 text-gray-800 font-medium ml-3">Send Feedback</Text>
          <ChevronRight size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-white p-4 rounded-xl flex-row items-center"
          onPress={signOut}
        >
          <LogOut size={22} color="#EF4444" />
          <Text className="flex-1 text-red-500 font-medium ml-3">Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
