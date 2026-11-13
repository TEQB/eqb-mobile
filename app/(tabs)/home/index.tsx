import { useState, useMemo, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl, Linking, Modal } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";
import QRCode from "react-native-qrcode-svg";
import { ChevronRight, Download, Smartphone, X } from "lucide-react-native";

interface StudentCourse {
  id: string;
  code: string;
  title: string;
  level: number;
  scope: "departmental" | "shared" | "general";
}

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();
  const [apkQrOpen, setApkQrOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile-full", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, current_level, programme_id, programme:programme_id(id, name, available_levels)")
        .eq("auth_user_id", user!.id)
        .single();
      if (error) throw error;
      return data as Record<string, any>;
    },
    enabled: !!user,
  });

  const programmeId = (profile as any)?.programme_id as string | undefined;
  const currentLevel = (profile as any)?.current_level as number | undefined;
  const programmeName = (profile as any)?.programme?.name as string | undefined;
  const availableLevels = ((profile as any)?.programme?.available_levels as number[]) || [100, 200, 300, 400, 500, 600];

  const [activeLevel, setActiveLevel] = useState(currentLevel || 100);

  // Update activeLevel when profile loads
  useEffect(() => {
    if (currentLevel) {
      setActiveLevel(currentLevel);
    }
  }, [currentLevel]);

  const { data: apkUrl } = useQuery({
    queryKey: ["apk-download-url"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("apk_download_url")
        .single();
      return (data as any)?.apk_download_url as string | null;
    },
  });

  const { data: allCourses, isLoading: coursesLoading } = useQuery({
    queryKey: ["courses-for-programme", programmeId],
    queryFn: async () => {
      if (!programmeId) return [];
      const { data, error } = await supabase
        .from("courses")
        .select("id, code, title, level, scope, programme_id")
        .or(`scope.eq.general,programme_id.eq.${programmeId}`)
        .order("level");
      if (error) throw error;
      return (data as StudentCourse[]) || [];
    },
    enabled: !!programmeId,
  });

  const courseIds = useMemo(() => allCourses?.map((c) => c.id) || [], [allCourses]);

  const { data: questionCounts } = useQuery({
    queryKey: ["question-counts", courseIds],
    queryFn: async () => {
      if (courseIds.length === 0) return {} as Record<string, number>;
      const { data } = await supabase
        .from("past_questions")
        .select("course_id")
        .in("course_id", courseIds)
        .eq("status", "published");
      const counts: Record<string, number> = {};
      for (const row of (data || []) as { course_id: string }[]) {
        counts[row.course_id] = (counts[row.course_id] || 0) + 1;
      }
      return counts;
    },
    enabled: courseIds.length > 0,
  });

  const generalCourses = useMemo(
    () => (allCourses || []).filter((c) => c.scope === "general" && c.level === activeLevel),
    [allCourses, activeLevel],
  );

  const programmeCourses = useMemo(
    () => (allCourses || []).filter((c) => c.scope !== "general" && c.level === activeLevel),
    [allCourses, activeLevel],
  );

  return (
    <>
    <ScrollView
      className="flex-1 bg-background"
      refreshControl={
        <RefreshControl
          refreshing={coursesLoading}
          onRefresh={() => {
            queryClient.invalidateQueries({ queryKey: ["courses-for-programme"] });
            queryClient.invalidateQueries({ queryKey: ["question-counts"] });
            queryClient.invalidateQueries({ queryKey: ["profile-full"] });
          }}
          tintColor="#7A1030"
          colors={["#7A1030"]}
        />
      }
    >
      <View className="px-5 pt-5 pb-2">
        <Text className="text-muted-foreground text-sm">Welcome back,</Text>
        <Text className="text-foreground text-2xl font-bold">{((profile as any)?.full_name as string) || "Student"}</Text>
        {programmeName && (
          <Text className="text-muted-foreground text-sm mt-0.5">{programmeName}</Text>
        )}
      </View>

      <View className="px-5 py-3">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {availableLevels.map((level: number) => (
              <TouchableOpacity
                key={level}
                className={`px-5 py-2.5 rounded-full ${activeLevel === level ? "bg-secondary" : "bg-muted"}`}
                onPress={() => setActiveLevel(level)}
              >
                <Text className={activeLevel === level ? "text-secondary-foreground font-medium text-sm" : "text-foreground text-sm"}>
                  {level} Level
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {apkUrl && (
        <TouchableOpacity
          className="mx-5 mt-3 bg-white/90 rounded-2xl p-4 flex-row items-center shadow-sm"
          style={{ shadowColor: "rgba(63,39,50,0.06)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12 }}
          onPress={() => setApkQrOpen(true)}
        >
          <View className="w-11 h-11 bg-primary rounded-xl items-center justify-center">
            <Smartphone size={20} color="white" />
          </View>
          <View className="flex-1 ml-3">
            <Text className="text-foreground font-semibold">Get the EQB mobile app</Text>
            <Text className="text-muted-foreground text-xs mt-0.5">Download the latest APK for Android</Text>
          </View>
          <View className="bg-primary rounded-full px-4 py-2 flex-row items-center gap-1.5">
            <Download size={14} color="white" />
            <Text className="text-primary-foreground text-xs font-semibold">Download</Text>
          </View>
        </TouchableOpacity>
      )}

      {coursesLoading ? (
        <ActivityIndicator size="large" className="mt-10" />
      ) : (
        <View className="px-5 pb-8 gap-6">
          <Section
            title="General Courses"
            courses={generalCourses}
            questionCounts={questionCounts || {}}
            onPress={(id: string) => router.push(`/course/${id}`)}
            emptyMessage="No general courses found for this level."
          />

          <Section
            title="Programme Courses"
            courses={programmeCourses}
            questionCounts={questionCounts || {}}
            onPress={(id: string) => router.push(`/course/${id}`)}
            emptyMessage="No programme courses found for this level."
          />
        </View>
      )}
    </ScrollView>

    <Modal visible={apkQrOpen} transparent animationType="fade" onRequestClose={() => setApkQrOpen(false)}>
      <View className="flex-1 bg-black/50 items-center justify-center px-6">
        <View className="bg-white rounded-3xl p-6 w-full max-w-sm items-center">
          <View className="w-full flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-foreground">Download EQB App</Text>
            <TouchableOpacity onPress={() => setApkQrOpen(false)} className="p-1">
              <X size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <Text className="text-sm text-muted-foreground text-center mb-4">
            Scan this code with another phone to download the app, or tap below to download on this device.
          </Text>
          <View className="bg-white p-4 rounded-2xl border border-border mb-4">
            <QRCode value={apkUrl ?? ""} size={200} />
          </View>
          <TouchableOpacity
            className="w-full bg-primary py-3.5 rounded-2xl flex-row items-center justify-center gap-2"
            onPress={() => apkUrl && Linking.openURL(apkUrl)}
          >
            <Download size={18} color="white" />
            <Text className="text-primary-foreground font-semibold">Download on this device</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    </>
  );
}

function Section({
  title,
  courses,
  questionCounts,
  onPress,
  emptyMessage,
}: {
  title: string;
  courses: StudentCourse[];
  questionCounts: Record<string, number>;
  onPress: (id: string) => void;
  emptyMessage: string;
}) {
  return (
    <View>
      <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{title}</Text>
      {courses.length === 0 ? (
        <View className="bg-white/90 rounded-2xl p-6 items-center">
          <Text className="text-muted-foreground text-sm">{emptyMessage}</Text>
        </View>
      ) : (
        <View className="gap-3">
          {courses.map((course, idx) => (
            <TouchableOpacity
              key={course.id}
              className="bg-white/90 rounded-2xl p-5 shadow-sm"
              style={{
                shadowColor: "rgba(63,39,50,0.06)",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 1,
                shadowRadius: 12,
              }}
              onPress={() => onPress(course.id)}
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="font-mono font-bold text-primary text-sm">{course.code}</Text>
                    {course.scope === "general" && (
                      <View className="bg-primary rounded-full px-2 py-0.5">
                        <Text className="text-primary-foreground text-[10px] font-semibold">General</Text>
                      </View>
                    )}
                    {course.scope === "shared" && (
                      <View className="bg-secondary rounded-full px-2 py-0.5">
                        <Text className="text-secondary-foreground text-[10px] font-semibold">Shared</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-foreground font-medium mt-1" numberOfLines={2}>{course.title}</Text>
                  <Text className="text-muted-foreground text-sm mt-2">
                    Level {course.level} · {questionCounts[course.id] || 0} question{(questionCounts[course.id] || 0) !== 1 ? "s" : ""}
                  </Text>
                </View>
                <ChevronRight size={18} color="#9CA3AF" className="mt-1" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}
