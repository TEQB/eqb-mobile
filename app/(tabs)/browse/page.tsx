import { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Search } from "lucide-react-native";

const LEVELS = [100, 200, 300, 400, 500, 600];

interface Course {
  id: string;
  code: string;
  title: string;
  level: number;
}

export default function BrowseScreen() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const [activeLevel, setActiveLevel] = useState(100);
  const [search, setSearch] = useState("");

  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses", "browse", activeLevel],
    queryFn: async () => {
      let query = supabase
        .from("courses")
        .select("id, code, title, level")
        .eq("level", activeLevel)
        .order("code");

      if (search.trim()) {
        query = query.or(`title.ilike.%${search}%,code.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as Course[]) || [];
    },
  });

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-6 pt-14 pb-4">
        <Text className="text-2xl font-bold text-gray-900">Browse Courses</Text>

        <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2 mt-3">
          <Search size={18} color="#9CA3AF" />
          <TextInput
            className="flex-1 ml-2 text-base"
            placeholder="Search by code or title..."
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <View className="px-6 py-3">
        <FlatList
          horizontal
          data={LEVELS}
          keyExtractor={(l: number) => String(l)}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }: { item: number }) => (
            <TouchableOpacity
              className={`px-5 py-2 rounded-full mr-2 ${activeLevel === item ? "bg-primary" : "bg-gray-200"}`}
              onPress={() => setActiveLevel(item)}
            >
              <Text className={activeLevel === item ? "text-white font-medium" : "text-gray-700"}>
                Level {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" className="mt-10" />
      ) : (
        <FlatList
          className="px-6"
          data={courses}
          keyExtractor={(item: Course) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
          ListEmptyComponent={
            <Text className="text-gray-500 text-center mt-10">No courses found for this level</Text>
          }
          renderItem={({ item }: { item: Course }) => (
            <TouchableOpacity
              className="flex-1 bg-white p-4 rounded-xl"
              onPress={() => router.push(`/course/${item.id}`)}
            >
              <Text className="text-primary font-bold text-sm">{item.code}</Text>
              <Text className="text-gray-800 font-medium mt-1" numberOfLines={2}>
                {item.title}
              </Text>
              <Text className="text-gray-400 text-xs mt-2">Level {item.level}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
