import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";
import { formatSession } from "@/lib/utils";

interface ExploreItem {
  id: string;
  year: number;
  semester: string;
  status: string;
  courses: { code: string; title: string } | null;
}

export default function ExploreScreen() {
  const router = useRouter();
  const supabase = getSupabaseClient();

  const { data: questions, isLoading } = useQuery({
    queryKey: ["explore"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("past_questions")
        .select("id, year, semester, status, courses!inner(code, title)")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data as ExploreItem[]) || [];
    },
  });

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-6 pt-14 pb-4">
        <Text className="text-2xl font-bold text-gray-900">Explore</Text>
        <Text className="text-gray-500 mt-1">Recent uploads from everyone</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" className="mt-10" />
      ) : (
        <FlatList
          className="px-6 pt-4"
          data={questions}
          keyExtractor={(item: ExploreItem) => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <Text className="text-gray-500 text-center mt-10">No questions uploaded yet</Text>
          }
          renderItem={({ item }: { item: ExploreItem }) => (
            <TouchableOpacity
              className="bg-white p-4 rounded-xl mb-3"
              onPress={() => router.push(`/question/${item.id}`)}
            >
              <Text className="text-primary font-bold">{item.courses?.code}</Text>
              <Text className="text-gray-800 font-medium mt-1" numberOfLines={1}>
                {item.courses?.title}
              </Text>
              <Text className="text-gray-400 text-xs mt-1">
                {formatSession(item.year)} · {item.semester} semester
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
