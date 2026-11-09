import { useState, useRef, type ComponentRef } from "react";
import {
  View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Dimensions, Image, Alert, Modal,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getApiBaseUrl } from "@/lib/env";
import {
  ChevronLeft, Download, Flag, FileText, Info, RefreshCw, ZoomIn, ZoomOut,
} from "lucide-react-native";
import { Paths, File } from "expo-file-system";
import { SolutionList } from "@/components/solutions/SolutionList";
import { SolutionForm } from "@/components/solutions/SolutionForm";
import { useAuth } from "@/providers/AuthProvider";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;

const flagReasons = [
  { value: "wrong_course", label: "Wrong course" },
  { value: "poor_quality", label: "Poor quality" },
  { value: "duplicate", label: "Duplicate" },
  { value: "inappropriate", label: "Inappropriate" },
] as const;

export default function QuestionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const supabase = getSupabaseClient();
  const { user } = useAuth();
  const API_BASE = getApiBaseUrl();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  const [flagOpen, setFlagOpen] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [flagError, setFlagError] = useState("");
  const [flagSubmitted, setFlagSubmitted] = useState(false);

  const [imageZoom, setImageZoom] = useState(1);
  const [fullscreenPage, setFullscreenPage] = useState<number | null>(null);

  const { data: question } = useQuery({
    queryKey: ["question", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("past_questions")
        .select("*, courses!inner(code, title, scope)")
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

  const { data: pages, isLoading: pagesLoading } = useQuery({
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
      const destFile = new File(Paths.cache, `${question.courses?.code || "question"}_${question.year}.jpg`);
      const downloaded = await File.downloadFileAsync(fileUrl, destFile, { idempotent: true });
      Alert.alert("Downloaded", `Saved to ${downloaded.uri}`);
    } catch {
      Alert.alert("Error", "Failed to download file");
    }
  };

  const handleFlag = async () => {
    if (!flagReason) return;
    setFlagError("");

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user!.id)
      .single();

    const { error: insertError } = await supabase.from("flags").insert({
      question_id: id,
      flagged_by: (profile as any)?.id,
      reason: flagReason,
    } as any);

    if (insertError) {
      if (insertError.code === "23505") {
        setFlagError("You've already flagged this question");
      } else {
        setFlagError("Something went wrong");
      }
      return;
    }

    setFlagSubmitted(true);
    setTimeout(() => {
      setFlagOpen(false);
      setFlagSubmitted(false);
      setFlagReason("");
      setFlagError("");
    }, 1500);
  };

  const formatExamType = (t: string) =>
    t === "mid_semester" ? "Mid Semester" : "Examination";

  const formatSession = (year: number) => `${year - 1}/${year}`;

  return (
    <View className="flex-1 bg-background">
      <ScrollView ref={scrollRef} className="flex-1">
        {/* Back button */}
        <View className="px-5 pt-14 pb-2">
          <TouchableOpacity onPress={() => router.back()} className="flex-row items-center gap-1.5">
            <ChevronLeft size={18} color="#D4750A" />
            <Text className="text-secondary text-sm font-medium">Back</Text>
          </TouchableOpacity>
        </View>

        {/* Question Info Card */}
        <View className="mx-5 mb-5 rounded-2xl border border-white/70 bg-white/70 p-5 shadow-sm"
          style={{ shadowColor: "rgba(63,39,50,0.08)", shadowOffset: { width: 0, height: 18 }, shadowOpacity: 1, shadowRadius: 45 }}>
          <View className="flex-row items-start justify-between">
            <View className="flex-1 mr-3">
              <Text className="text-2xl font-bold text-primary">
                {question?.courses?.code ?? "—"} — {question?.courses?.title ?? "—"}
              </Text>
              <View className="flex-row items-center gap-2 mt-2 flex-wrap">
                <Text className="text-sm text-muted-foreground">{question?.level}L</Text>
                <Text className="text-muted-foreground">·</Text>
                <Text className="text-sm text-muted-foreground">
                  {question?.exam_type ? formatExamType(question.exam_type) : "—"}
                </Text>
                <Text className="text-muted-foreground">·</Text>
                <Text className="text-sm text-muted-foreground">
                  {question?.semester === "first" ? "1st" : question?.semester === "second" ? "2nd" : ""} Semester
                </Text>
                <Text className="text-muted-foreground">·</Text>
                <Text className="text-sm text-muted-foreground">
                  {question?.year ? formatSession(question.year) : "—"}
                </Text>
              </View>
              <View className="flex-row items-center gap-1.5 mt-2 flex-wrap">
                {question?.file_type && (
                  <View className="rounded-full border border-secondary/25 bg-secondary/10 px-2.5 py-0.5">
                    <Text className="text-xs font-medium text-secondary">{question.file_type.toUpperCase()}</Text>
                  </View>
                )}
                {question?.courses?.scope && question.courses.scope !== "departmental" && (
                  <View className={`rounded-full px-2.5 py-0.5 ${
                    question.courses.scope === "shared" ? "bg-blue-50 border border-blue-200" : "bg-primary/10 border border-primary/20"
                  }`}>
                    <Text className={`text-xs font-medium ${
                      question.courses.scope === "shared" ? "text-blue-700" : "text-primary"
                    }`}>
                      {question.courses.scope === "shared" ? "Shared" : "General"}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={handleDownload}
                className="rounded-2xl border border-white/70 bg-white/75 px-3 py-1.5"
              >
                <Download size={16} color="#6C5560" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setFlagOpen(true)}
                className="rounded-2xl border border-white/70 bg-white/75 px-3 py-1.5"
              >
                <Flag size={16} color="#6C5560" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* File Viewer(s) */}
        <View className="mx-5 mb-5">
          {pagesLoading ? (
            <View className="h-64 justify-center items-center rounded-2xl border border-gray-200 bg-white">
              <ActivityIndicator size="large" color="#7A1030" />
            </View>
          ) : pages && pages.length > 0 ? (
            <View className="gap-4">
              {pages.map((page: any) => (
                <View key={page.id} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                  <View className="flex-row items-center gap-2 px-4 pt-4 pb-2">
                    <FileText size={16} color="#9CA3AF" />
                    <Text className="text-sm font-medium text-muted-foreground">Page {page.page_number}</Text>
                  </View>
                  {page.file_type === "pdf" ? (
                    <View className="h-96 items-center justify-center bg-gray-50 px-4 pb-4">
                      <TouchableOpacity
                        onPress={() => Alert.alert("PDF", "PDF viewing not available on mobile yet")}
                        className="items-center gap-2"
                      >
                        <FileText size={48} color="#7A1030" />
                        <Text className="text-sm text-muted-foreground">Tap to open PDF</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      activeOpacity={1}
                      onPress={() => setFullscreenPage(fullscreenPage === page.page_number ? null : page.page_number)}
                    >
                      <Image
                        source={{ uri: `${API_BASE}/api/storage/${page.file_url}?wm=1` }}
                        style={{
                          width: SCREEN_WIDTH - 40,
                          height: (SCREEN_WIDTH - 40) * 1.4,
                        }}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View className="h-64 justify-center items-center rounded-2xl border border-gray-200 bg-white">
              <Text className="text-sm text-muted-foreground">Preview not available for this upload yet</Text>
            </View>
          )}
        </View>

        {/* AI Enhancement Note */}
        <View className="mx-5 mb-5">
          <Text className="text-xs text-gray-400 italic">Some images may have been AI-enhanced for clarity.</Text>
        </View>

        {/* Solutions Section */}
        <View className="mx-5 mb-10">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-primary">Community Solutions</Text>
            {solutions && solutions.length > 0 && (
              <Text className="text-xs text-secondary font-medium">{solutions.length} solution{solutions.length !== 1 ? "s" : ""}</Text>
            )}
          </View>
          <SolutionForm questionId={id} onSubmitted={() => refetchSolutions()} />
          {solutions && solutions.length > 0 ? (
            <View className="mt-4">
              <SolutionList solutions={solutions} />
            </View>
          ) : (
            <Text className="text-sm text-muted-foreground mt-4">No solutions yet. Be the first to contribute!</Text>
          )}
        </View>
      </ScrollView>

      {/* Flag Modal */}
      <Modal visible={flagOpen} transparent animationType="fade" onRequestClose={() => setFlagOpen(false)}>
        <View className="flex-1 justify-center items-center bg-black/50 px-6">
          <View className="w-full rounded-3xl bg-white p-6 shadow-lg" style={{ shadowColor: "rgba(63,39,50,0.2)", shadowOffset: { width: 0, height: 18 }, shadowOpacity: 1, shadowRadius: 45 }}>
            <Text className="text-lg font-bold text-primary mb-1">Report this question</Text>
            <Text className="text-sm text-muted-foreground mb-4">Select a reason for reporting</Text>

            {flagSubmitted ? (
              <Text className="text-sm font-medium text-green-700">Thanks for reporting!</Text>
            ) : (
              <>
                <View className="gap-2 mb-4">
                  {flagReasons.map((r) => (
                    <TouchableOpacity
                      key={r.value}
                      onPress={() => setFlagReason(r.value)}
                      className={`flex-row items-center gap-3 rounded-2xl border p-3.5 ${
                        flagReason === r.value
                          ? "border-secondary bg-secondary/10"
                          : "border-white/70 bg-white/70"
                      }`}
                    >
                      <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                        flagReason === r.value ? "border-secondary" : "border-gray-300"
                      }`}>
                        {flagReason === r.value && <View className="w-3 h-3 rounded-full bg-secondary" />}
                      </View>
                      <Text className="text-sm text-foreground">{r.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {flagError && <Text className="text-sm text-red-600 mb-3">{flagError}</Text>}

                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={handleFlag}
                    disabled={!flagReason}
                    className="flex-1 rounded-2xl bg-primary py-3 items-center disabled:opacity-50"
                  >
                    <Text className="text-sm font-semibold text-white">Submit report</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { setFlagOpen(false); setFlagReason(""); setFlagError(""); }}
                    className="flex-1 rounded-2xl border border-gray-200 bg-white py-3 items-center"
                  >
                    <Text className="text-sm font-medium text-muted-foreground">Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Fullscreen Image */}
      <Modal visible={fullscreenPage !== null} transparent animationType="fade" onRequestClose={() => setFullscreenPage(null)}>
        <View className="flex-1 bg-black">
          <View className="flex-row items-center justify-between px-5 pt-14 pb-3">
            <TouchableOpacity onPress={() => setFullscreenPage(null)}>
              <ChevronLeft size={24} color="white" />
            </TouchableOpacity>
            <View className="flex-row gap-4">
              <TouchableOpacity onPress={() => setImageZoom((z) => Math.max(0.5, z - 0.25))}>
                <ZoomOut size={22} color="white" />
              </TouchableOpacity>
              <Text className="text-white font-medium text-sm">{Math.round(imageZoom * 100)}%</Text>
              <TouchableOpacity onPress={() => setImageZoom((z) => Math.min(3, z + 0.25))}>
                <ZoomIn size={22} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setImageZoom(1)}>
                <RefreshCw size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center" }}
            className="flex-1 px-4"
          >
            {pages?.filter((p) => p.page_number === fullscreenPage).map((page: any) => (
              <ScrollView
                key={page.id}
                horizontal
                bouncesZoom
                maximumZoomScale={3}
                minimumZoomScale={0.5}
                className="flex-1"
                contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center" }}
              >
                <Image
                  source={{ uri: `${API_BASE}/api/storage/${page.file_url}?wm=1` }}
                  style={{
                    width: SCREEN_WIDTH * imageZoom,
                    height: SCREEN_HEIGHT * 0.7 * imageZoom,
                  }}
                  resizeMode="contain"
                />
              </ScrollView>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
