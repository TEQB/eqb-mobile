import { useRef } from "react";
import {
  View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Dimensions, Image, Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getApiBaseUrl } from "@/lib/env";
import { Download, Flag, ChevronLeft } from "lucide-react-native";
import { Paths, File } from "expo-file-system";
import { SolutionList } from "@/components/solutions/SolutionList";
import { SolutionForm } from "@/components/solutions/SolutionForm";
import { useAuth } from "@/providers/AuthProvider";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function QuestionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const supabase = getSupabaseClient();
  const { user } = useAuth();
  const API_BASE = getApiBaseUrl();
  const scrollRef = useRef<ScrollView>(null);

  const { data: question } = useQuery({
    queryKey: ["question", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("past_questions")
        .select("*, courses!inner(code, title)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: solutions, refetch: refetchSolutions } = useQuery({
    queryKey: ["solutions", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("solutions")
        .select("*, profiles!inner(full_name, auth_user_id)")
        .eq("question_id", id)
        .order("rating_sum", { ascending: false });
      if (error) throw error;

      const currentProfileId = user
        ? (await supabase.from("profiles").select("id").eq("auth_user_id", user.id).single()).data?.id
        : null;

      const solutionIds = (data || []).map((s: any) => s.id);
      let userVotes: Record<string, "up" | "down"> = {};
      let userRatings: Record<string, number> = {};
      if (currentProfileId && solutionIds.length > 0) {
        const [votesRes, ratingsRes] = await Promise.all([
          supabase.from("solution_votes").select("solution_id, vote").in("solution_id", solutionIds).eq("voter_id", currentProfileId),
          supabase.from("solution_ratings").select("solution_id, rating").in("solution_id", solutionIds).eq("rater_id", currentProfileId),
        ]);
        for (const v of (votesRes.data || []) as any[]) userVotes[v.solution_id] = v.vote;
        for (const r of (ratingsRes.data || []) as any[]) userRatings[r.solution_id] = r.rating;
      }

      return ((data || []) as any[]).map((s: any) => ({
        id: s.id,
        body: s.body,
        file_url: s.file_url,
        submitted_by: s.submitted_by,
        author_name: s.profiles?.full_name || "Unknown",
        upvotes: s.upvotes,
        downvotes: s.downvotes,
        user_vote: userVotes[s.id] || null,
        is_own: s.submitted_by === currentProfileId,
        created_at: s.created_at,
        rating_sum: s.rating_sum,
        rating_count: s.rating_count,
        user_rating: userRatings[s.id] || null,
      }));
    },
    enabled: !!id,
  });

  const { data: pages } = useQuery({
    queryKey: ["question-pages", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("past_question_pages")
        .select("*")
        .eq("question_id", id)
        .order("page_number", { ascending: true });
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!id,
  });

  const handleDownload = async () => {
    if (!question) return;
    const fileUrl = `${API_BASE}/api/storage/${question.file_url}`;
    try {
      const destFile = new File(Paths.cache, `${question.courses?.code}_${question.year}.jpg`);
      const downloaded = await File.downloadFileAsync(fileUrl, destFile, { idempotent: true });
      Alert.alert("Downloaded", `Saved to ${downloaded.uri}`);
    } catch {
      Alert.alert("Error", "Failed to download file");
    }
  };

  const handleFlag = async () => {
    Alert.alert("Flag content", "Are you sure you want to report this question?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Flag",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("flags").insert({
            question_id: id,
            reason: "inappropriate",
          } as any);
          if (error) Alert.alert("Error", error.message);
          else Alert.alert("Flagged", "This question has been reported for review");
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-black">
      <View className="absolute top-0 left-0 right-0 z-10 pt-12 px-4 flex-row justify-between">
        <TouchableOpacity onPress={() => router.back()} className="bg-black/50 p-2 rounded-full">
          <ChevronLeft size={24} color="white" />
        </TouchableOpacity>
        <View className="flex-row gap-2">
          <TouchableOpacity onPress={handleDownload} className="bg-black/50 p-2 rounded-full">
            <Download size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleFlag} className="bg-black/50 p-2 rounded-full">
            <Flag size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <View className="absolute bottom-0 left-0 right-0 z-10 bg-black/50 py-2 px-4">
        <Text className="text-white text-center text-sm">
          {question?.courses?.code} · {question?.courses?.title}
        </Text>
      </View>

      <ScrollView ref={scrollRef} className="flex-1">
        {pages && pages.length > 0 ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {pages.map((page: any) => (
              <Image
                key={page.page_number}
                source={{ uri: `${API_BASE}/api/storage/${page.file_url}?wm=1` }}
                style={{ width: SCREEN_WIDTH, height: 400 }}
                resizeMode="contain"
              />
            ))}
          </ScrollView>
        ) : (
          <View className="h-96 justify-center items-center">
            <ActivityIndicator size="large" color="white" />
          </View>
        )}

        <View className="bg-gray-50 min-h-full px-4 pt-4 pb-12">
          <Text className="text-lg font-bold text-gray-900 mb-3">Solutions</Text>
          <SolutionForm questionId={id} onSubmitted={() => refetchSolutions()} />
          {solutions && solutions.length > 0 ? (
            <>
              <Text className="text-sm text-gray-500 my-3">
                {solutions.length} solution{solutions.length !== 1 ? "s" : ""}
              </Text>
              <SolutionList solutions={solutions} />
            </>
          ) : (
            <Text className="text-sm text-gray-400 mt-4">No solutions yet. Be the first to contribute!</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}