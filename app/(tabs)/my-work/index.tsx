import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, SectionList } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function MyWorkScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = getSupabaseClient();

  const { data: profile } = useQuery({
    queryKey: ["profile-id", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_user_id", user!.id)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!user,
  });

  const { data: questions, isLoading: qLoading } = useQuery({
    queryKey: ["contributions", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("past_questions")
        .select("id, year, semester, status, courses!inner(code)")
        .eq("uploaded_by", profile!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!profile,
  });

  const { data: mySolutions, isLoading: sLoading } = useQuery({
    queryKey: ["my-solutions", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("solutions")
        .select("id, body, upvotes, downvotes, created_at, question_id, past_questions!inner(courses!inner(code), year)")
        .eq("submitted_by", profile!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!profile,
  });

  const statusColors: Record<string, string> = {
    published: "text-green-600",
    pending_review: "text-yellow-600",
    rejected: "text-red-600",
    suspended: "text-gray-500",
  };

  const sections = [
    {
      title: "Uploaded Questions",
      data: questions || [],
      type: "question" as const,
    },
    {
      title: "Submitted Solutions",
      data: mySolutions || [],
      type: "solution" as const,
    },
  ];

  const isLoading = qLoading || sLoading;

  return (
    <View className="flex-1 bg-background">
      <View className="px-5 pt-5 pb-2">
        <Text className="text-foreground text-2xl font-bold">My Work</Text>
        <Text className="text-muted-foreground text-sm mt-1">Your contributions and solutions</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" className="mt-10" />
      ) : (
        <SectionList
          className="px-5 pt-3"
          sections={sections}
          keyExtractor={(item: any, index) => item.id + index}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderSectionHeader={({ section }) => (
            <Text className="text-lg font-bold text-foreground mt-4 mb-3">{section.title}</Text>
          )}
          renderSectionFooter={({ section }) =>
            section.data.length === 0 ? (
              <View className="bg-white/90 rounded-2xl p-6 items-center mb-4">
                <Text className="text-muted-foreground text-sm">Nothing yet</Text>
                {section.type === "question" && (
                  <TouchableOpacity
                    className="mt-3 bg-primary py-2 px-5 rounded-xl"
                    onPress={() => router.push("/(tabs)/upload")}
                  >
                    <Text className="text-primary-foreground font-medium text-sm">Upload your first question</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null
          }
          renderItem={({ item, section }: any) =>
            section.type === "question" ? (
              <TouchableOpacity
                className="bg-white/90 p-4 rounded-2xl mb-3"
                onPress={() => router.push(`/question/${item.id}`)}
              >
                <View className="flex-row justify-between items-center">
                  <Text className="text-primary font-bold">{item.courses?.code}</Text>
                  <Text className={`text-sm capitalize ${statusColors[item.status] || "text-gray-500"}`}>
                    {item.status.replace("_", " ")}
                  </Text>
                </View>
                <Text className="text-muted-foreground text-sm mt-1">
                  {item.year}/{item.year + 1} · {item.semester} semester
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                className="bg-white/90 p-4 rounded-2xl mb-3"
                onPress={() => router.push(`/question/${item.question_id}`)}
              >
                <Text className="text-primary font-bold">{item.past_questions?.courses?.code}</Text>
                <Text className="text-muted-foreground text-sm mt-1">
                  {item.past_questions?.year}/{item.past_questions?.year + 1}
                </Text>
                <Text className="text-muted-foreground text-xs mt-1">
                  {item.upvotes} upvotes · {item.downvotes} downvotes
                </Text>
              </TouchableOpacity>
            )
          }
        />
      )}
    </View>
  );
}
