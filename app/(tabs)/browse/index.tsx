import { useState, useMemo, useEffect, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Search, ChevronRight } from "lucide-react-native";

interface StudentCourse {
  id: string;
  code: string;
  title: string;
  level: number;
  scope: "departmental" | "shared" | "general";
}

interface Faculty { id: string; name: string }
interface Programme { id: string; name: string }
interface ExploreCourse { id: string; code: string; title: string; level: number }

export default function BrowseScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = getSupabaseClient();
  const [search, setSearch] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["profile-browse", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, programme_id")
        .eq("auth_user_id", user!.id)
        .single();
      if (error) throw error;
      return data as { id: string; programme_id: string };
    },
    enabled: !!user,
  });

  const programmeId = profile?.programme_id;

  const { data: allCourses, isLoading } = useQuery({
    queryKey: ["all-courses", programmeId],
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

  const { data: questionCounts } = useQuery({
    queryKey: ["question-counts-all", allCourses?.map((c) => c.id) || []],
    queryFn: async () => {
      const ids = allCourses?.map((c) => c.id) || [];
      if (ids.length === 0) return {} as Record<string, number>;
      const { data } = await supabase
        .from("past_questions")
        .select("course_id")
        .in("course_id", ids)
        .eq("status", "published");
      const counts: Record<string, number> = {};
      for (const row of (data || []) as { course_id: string }[]) {
        counts[row.course_id] = (counts[row.course_id] || 0) + 1;
      }
      return counts;
    },
    enabled: (allCourses?.length || 0) > 0,
  });

  const filtered = useMemo(() => {
    if (!allCourses) return [];
    if (!search.trim()) return allCourses;
    const q = search.toLowerCase();
    return allCourses.filter((c) =>
      c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q),
    );
  }, [allCourses, search]);

  // --- Explore section ---
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedProgramme, setSelectedProgramme] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");

  const { data: faculties } = useQuery({
    queryKey: ["faculties"],
    queryFn: async () => {
      const { data, error } = await supabase.from("faculties").select("id, name").order("name");
      if (error) throw error;
      return (data as Faculty[]) || [];
    },
  });

  const { data: programmes } = useQuery({
    queryKey: ["programmes-by-faculty", selectedFaculty],
    queryFn: async () => {
      if (!selectedFaculty) return [];
      const { data, error } = await supabase
        .from("programmes")
        .select("id, name")
        .eq("faculty_id", selectedFaculty)
        .order("name");
      if (error) throw error;
      return (data as Programme[]) || [];
    },
    enabled: !!selectedFaculty,
  });

  const { data: exploreCourses } = useQuery({
    queryKey: ["courses-by-programme", selectedProgramme],
    queryFn: async () => {
      if (!selectedProgramme) return [];
      const { data, error } = await supabase
        .from("courses")
        .select("id, code, title, level")
        .eq("programme_id", selectedProgramme)
        .order("code");
      if (error) throw error;
      return (data as ExploreCourse[]) || [];
    },
    enabled: !!selectedProgramme,
  });

  useEffect(() => {
    if (selectedCourse) {
      router.push(`/course/${selectedCourse}`);
      setSelectedCourse("");
    }
  }, [selectedCourse, router]);

  const handleFacultyChange = (id: string) => {
    setSelectedFaculty(id);
    setSelectedProgramme("");
    setSelectedCourse("");
  };

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="px-5 pt-5 pb-2">
        <Text className="text-foreground text-2xl font-bold">Browse Courses</Text>
        <View className="flex-row items-center bg-white/90 rounded-xl px-4 h-12 mt-3 border border-input">
          <Search size={18} color="#6C5560" />
          <TextInput
            className="flex-1 ml-2 text-foreground"
            placeholder="Search by code or title..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" className="mt-10" />
      ) : (
        <View className="px-5 pb-4 gap-3">
          {filtered.map((course) => (
            <TouchableOpacity
              key={course.id}
              className="bg-white/90 rounded-2xl p-4 shadow-sm flex-row items-center"
              style={{ shadowColor: "rgba(63,39,50,0.06)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12 }}
              onPress={() => router.push(`/course/${course.id}`)}
            >
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
                <Text className="text-foreground font-medium mt-1" numberOfLines={1}>{course.title}</Text>
                <Text className="text-muted-foreground text-xs mt-1">
                  Level {course.level} · {questionCounts?.[course.id] || 0} questions
                </Text>
              </View>
              <ChevronRight size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Explore: Other Past Questions */}
      <View className="mx-5 mb-8 rounded-3xl bg-white/90 p-5 shadow-sm" style={{ shadowColor: "rgba(63,39,50,0.06)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12 }}>
        <Text className="text-lg font-bold text-primary">Other Past Questions</Text>
        <Text className="text-muted-foreground text-sm mt-1 mb-4">
          Select faculty, programme, and course to browse past questions from other departments.
        </Text>

        <View className="gap-4">
          <View>
            <Text className="text-sm font-semibold text-foreground mb-1.5">Faculty</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {(faculties || []).map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    className={`px-4 py-2.5 rounded-full ${selectedFaculty === f.id ? "bg-primary" : "bg-muted"}`}
                    onPress={() => handleFacultyChange(f.id)}
                  >
                    <Text className={selectedFaculty === f.id ? "text-primary-foreground font-medium text-sm" : "text-foreground text-sm"}>
                      {f.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {selectedFaculty ? (
            <View>
              <Text className="text-sm font-semibold text-foreground mb-1.5">Programme</Text>
              {programmes && programmes.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-2">
                    {programmes.map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        className={`px-4 py-2.5 rounded-full ${selectedProgramme === p.id ? "bg-primary" : "bg-muted"}`}
                        onPress={() => { setSelectedProgramme(p.id); setSelectedCourse(""); }}
                      >
                        <Text className={selectedProgramme === p.id ? "text-primary-foreground font-medium text-sm" : "text-foreground text-sm"}>
                          {p.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              ) : (
                <ActivityIndicator size="small" />
              )}
            </View>
          ) : null}

          {selectedProgramme ? (
            <View>
              <Text className="text-sm font-semibold text-foreground mb-1.5">Course</Text>
              {exploreCourses && exploreCourses.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-2">
                    {exploreCourses.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        className={`px-4 py-2.5 rounded-full ${selectedCourse === c.id ? "bg-primary" : "bg-muted"}`}
                        onPress={() => setSelectedCourse(c.id)}
                      >
                        <Text className={selectedCourse === c.id ? "text-primary-foreground font-medium text-sm" : "text-foreground text-sm"}>
                          {c.code} — {c.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              ) : (
                <ActivityIndicator size="small" />
              )}
            </View>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}
