import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";
import { MessageCircle } from "lucide-react-native";

interface Course {
  id: string;
  code: string;
  title: string;
  level: number;
}

interface Question {
  id: string;
  year: number;
  semester: string;
  status: string;
  created_at: string;
}

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const supabase = getSupabaseClient();

  const { data: course } = useQuery({
    queryKey: ["course", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Course;
    },
  });

  const { data: questions, isLoading } = useQuery({
    queryKey: ["questions", "course", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("past_questions")
        .select("id, year, semester, status, created_at")
        .eq("course_id", id)
        .eq("status", "published")
        .order("year", { ascending: false });
      if (error) throw error;
      return (data as Question[]) || [];
    },
    enabled: !!id,
  });

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-6 pt-14 pb-4">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-primary mb-2">← Back</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-gray-900">{course?.code || "Loading..."}</Text>
        <Text className="text-gray-600 mt-1">{course?.title}</Text>
        <TouchableOpacity
          className="mt-3 flex-row items-center gap-2 bg-primary rounded-xl px-4 py-2.5 self-start"
          onPress={() => router.push(`/group/course/${id}`)}
        >
          <MessageCircle size={18} color="white" />
          <Text className="text-primary-foreground font-semibold text-sm">Study Group</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" className="mt-10" />
      ) : (
        <FlatList
          className="px-6 pt-4"
          data={questions}
          keyExtractor={(item: Question) => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <Text className="text-gray-500 text-center mt-10">
              No questions available for this course yet
            </Text>
          }
          renderItem={({ item }: { item: Question }) => (
            <TouchableOpacity
              className="bg-white p-4 rounded-xl mb-3"
              onPress={() => router.push(`/question/${item.id}`)}
            >
              <Text className="text-gray-800 font-medium">
                {item.year}/{item.year + 1}
              </Text>
              <Text className="text-gray-400 text-sm capitalize">{item.semester} semester</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
