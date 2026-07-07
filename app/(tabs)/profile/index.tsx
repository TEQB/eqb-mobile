import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Clock, MessageSquare, LogOut, ChevronRight, User, Mail, BookOpen } from "lucide-react-native";

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
    <ScrollView className="flex-1 bg-background">
      <View className="items-center pt-8 pb-6 px-5">
        <View className="w-20 h-20 bg-primary rounded-full items-center justify-center mb-3 shadow-lg" style={{ shadowColor: "rgba(122,16,48,0.15)", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 24 }}>
          <Text className="text-3xl font-bold text-primary-foreground">
            {((profile?.full_name as string)?.charAt(0)) || "S"}
          </Text>
        </View>
        {isLoading ? (
          <ActivityIndicator />
        ) : (
          <>
            <Text className="text-xl font-bold text-foreground">{profile?.full_name as string}</Text>
            <View className="flex-row items-center mt-1">
              <Mail size={14} color="#6C5560" />
              <Text className="text-muted-foreground text-sm ml-1">{profile?.matric_number as string}</Text>
            </View>
            {profile?.programmes?.name && (
              <View className="flex-row items-center mt-0.5">
                <BookOpen size={14} color="#6C5560" />
                <Text className="text-muted-foreground text-sm ml-1">
                  {profile.programmes.name} · Level {profile.current_level}
                </Text>
              </View>
            )}
          </>
        )}
      </View>

      <View className="px-5 gap-3 pb-8">
        <TouchableOpacity
          className="bg-white/90 p-4 rounded-2xl flex-row items-center"
          onPress={() => router.push("/(tabs)/my-work")}
        >
          <Clock size={22} color="#7A1030" />
          <Text className="flex-1 text-foreground font-medium ml-3">My Contributions</Text>
          <ChevronRight size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-white/90 p-4 rounded-2xl flex-row items-center"
          onPress={() => router.push("/feedback")}
        >
          <MessageSquare size={22} color="#D4750A" />
          <Text className="flex-1 text-foreground font-medium ml-3">Send Feedback</Text>
          <ChevronRight size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <View className="h-px bg-border my-1" />

        <TouchableOpacity
          className="bg-white/90 p-4 rounded-2xl flex-row items-center"
          onPress={() => signOut().then(() => router.replace("/(auth)/login"))}
        >
          <LogOut size={22} color="#DC2626" />
          <Text className="flex-1 text-destructive font-medium ml-3">Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
