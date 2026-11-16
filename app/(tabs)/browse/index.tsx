import { useState, useMemo, useEffect, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshControl } from "react-native";
import { getSupabaseClient } from "@/lib/supabase/client";
import { sharedCoursesApi, type PendingSharedRequest, type StudentCourse as SharedCourse } from "@/lib/sharedCourses";
import { Search, ChevronRight, ThumbsUp, ThumbsDown, Link2, Unlink } from "lucide-react-native";

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
  const queryClient = useQueryClient();
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
  const profileId = (profile as any)?.id;

  // Shared course state
  const [activeTab, setActiveTab] = useState<"all" | "linked" | "joinable">("all");
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const [votingId, setVotingId] = useState<string | null>(null);

  // Load joinable shared courses
  const { data: joinableCourses } = useQuery({
    queryKey: ["joinable-courses", programmeId],
    queryFn: () => sharedCoursesApi.getJoinable(programmeId!),
    enabled: !!programmeId,
  });

  // Load linked shared course IDs
  const { data: linkedSharedIds } = useQuery({
    queryKey: ["linked-shared-ids", programmeId],
    queryFn: () => sharedCoursesApi.getLinkedSharedIds(programmeId!),
    enabled: !!programmeId,
  });

  // Load pending shared course requests
  const { data: pendingRequests } = useQuery({
    queryKey: ["pending-shared-requests", programmeId, profileId],
    queryFn: () => sharedCoursesApi.getPendingRequests(programmeId!, profileId!),
    enabled: !!programmeId && !!profileId,
  });

  // Filter out courses with pending join requests
  const pendingJoinCourseIds = useMemo(() => {
    return new Set((pendingRequests || []).filter((r) => r.action_type === "join").map((r) => r.course_id));
  }, [pendingRequests]);

  const pendingLeaveCourseIds = useMemo(() => {
    return new Set((pendingRequests || []).filter((r) => r.action_type === "leave").map((r) => r.course_id));
  }, [pendingRequests]);

  // Filter joinable courses to exclude those with pending requests
  const filteredJoinable = useMemo(() => {
    return (joinableCourses || []).filter((c) => !pendingJoinCourseIds.has(c.id));
  }, [joinableCourses, pendingJoinCourseIds]);

  const handleJoinShared = async (courseId: string) => {
    setJoiningId(courseId);
    try {
      const result = await sharedCoursesApi.joinShared(courseId);
      if (result.message === "request_created") {
        Alert.alert("Request sent", "Your programme-mates need to vote on this.");
      } else if (result.message === "request_pending") {
        Alert.alert("Already requested", "A request is already pending for this course.");
      } else if (result.message === "already_added") {
        Alert.alert("Already linked", "Your programme is already linked to this course.");
      }
      queryClient.invalidateQueries({ queryKey: ["joinable-courses"] });
      queryClient.invalidateQueries({ queryKey: ["pending-shared-requests"] });
      queryClient.invalidateQueries({ queryKey: ["all-courses"] });
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to join");
    } finally {
      setJoiningId(null);
    }
  };

  const handleLeaveShared = async (courseId: string) => {
    setLeavingId(courseId);
    try {
      const result = await sharedCoursesApi.leaveShared(courseId);
      if (result.message === "request_created") {
        Alert.alert("Request sent", "Your programme-mates need to vote on this.");
      } else if (result.message === "request_pending") {
        Alert.alert("Already requested", "A request is already pending for this course.");
      } else if (result.message === "not_linked") {
        Alert.alert("Not linked", "Your programme is not linked to this course.");
      }
      queryClient.invalidateQueries({ queryKey: ["joinable-courses"] });
      queryClient.invalidateQueries({ queryKey: ["pending-shared-requests"] });
      queryClient.invalidateQueries({ queryKey: ["all-courses"] });
      queryClient.invalidateQueries({ queryKey: ["linked-shared-ids"] });
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to leave");
    } finally {
      setLeavingId(null);
    }
  };

  const handleVote = async (requestId: string, vote: "approve" | "reject") => {
    setVotingId(requestId);
    try {
      const result = await sharedCoursesApi.vote(requestId, vote);
      if (result.message) {
        Alert.alert("Vote recorded", result.message);
      }
      queryClient.invalidateQueries({ queryKey: ["pending-shared-requests"] });
      queryClient.invalidateQueries({ queryKey: ["all-courses"] });
      queryClient.invalidateQueries({ queryKey: ["joinable-courses"] });
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to vote");
    } finally {
      setVotingId(null);
    }
  };

  const { data: allCourses, isLoading } = useQuery({
    queryKey: ["all-courses", programmeId],
    queryFn: async () => {
      if (!programmeId) return [];

      // Own courses: scope=general OR programme_id=own
      const { data: ownCourses, error: ownErr } = await supabase
        .from("courses")
        .select("id, code, title, level, scope, programme_id")
        .or(`scope.eq.general,programme_id.eq.${programmeId}`)
        .order("level");
      if (ownErr) throw ownErr;

      // Linked shared courses via programme_courses
      const { data: links, error: linksErr } = await supabase
        .from("programme_courses")
        .select("course_id, course:course_id(id, code, title, level, scope, programme_id)")
        .eq("programme_id", programmeId);
      if (linksErr) throw linksErr;

      const linkedIds = new Set((links as any[] | null)?.map((l) => l.course_id) || []);
      const ownList = ((ownCourses as StudentCourse[] | null) || []).filter((c) => !linkedIds.has(c.id));
      const linkedList = ((links as any[] | null) || [])
        .map((l) => l.course as StudentCourse)
        .filter(Boolean);

      return [...ownList, ...linkedList].sort((a, b) => a.level - b.level);
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

  // Separate linked shared courses from all courses
  const linkedSharedCourses = useMemo(() => {
    if (!allCourses || !linkedSharedIds) return [];
    return allCourses.filter((c) => linkedSharedIds.has(c.id));
  }, [allCourses, linkedSharedIds]);

  // Realtime subscriptions for shared course changes
  useEffect(() => {
    const channel = supabase
      .channel("browse-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "courses" }, () => {
        queryClient.invalidateQueries({ queryKey: ["all-courses"] });
        queryClient.invalidateQueries({ queryKey: ["joinable-courses"] });
        queryClient.invalidateQueries({ queryKey: ["question-counts-all"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "programme_courses" }, () => {
        queryClient.invalidateQueries({ queryKey: ["all-courses"] });
        queryClient.invalidateQueries({ queryKey: ["joinable-courses"] });
        queryClient.invalidateQueries({ queryKey: ["linked-shared-ids"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "shared_course_requests" }, () => {
        queryClient.invalidateQueries({ queryKey: ["pending-shared-requests"] });
        queryClient.invalidateQueries({ queryKey: ["joinable-courses"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "past_questions" }, () => {
        queryClient.invalidateQueries({ queryKey: ["question-counts-all"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient]);

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

  const { data: programmes, isLoading: programmesLoading } = useQuery({
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

  const { data: exploreCourses, isLoading: coursesLoading } = useQuery({
    queryKey: ["courses-by-programme", selectedProgramme],
    queryFn: async () => {
      if (!selectedProgramme) return [];
      const [ownRes, linksRes] = await Promise.all([
        supabase
          .from("courses")
          .select("id, code, title, level")
          .or(`scope.eq.general,programme_id.eq.${selectedProgramme}`)
          .order("code"),
        supabase
          .from("programme_courses")
          .select("course_id, course:course_id(id, code, title, level)")
          .eq("programme_id", selectedProgramme),
      ]);
      if (ownRes.error || linksRes.error) throw ownRes.error || linksRes.error;
      const own = (ownRes.data as ExploreCourse[]) || [];
      const links = (linksRes.data as Array<{ course_id: string; course: ExploreCourse }>) || [];
      const linkedIds = new Set(links.map((l) => l.course_id));
      return [
        ...own.filter((c) => !linkedIds.has(c.id)),
        ...links.map((l) => l.course),
      ].sort((a, b) => a.level - b.level);
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
    <ScrollView
      className="flex-1 bg-background"
      refreshControl={
        <RefreshControl
          refreshing={coursesLoading}
          onRefresh={() => {
            queryClient.invalidateQueries();
          }}
          tintColor="#7A1030"
          colors={["#7A1030"]}
        />
      }
    >
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
          {/* Tabs */}
          <View className="flex-row gap-1 bg-muted rounded-xl p-1 mb-2">
            {([
              { key: "all" as const, label: "All", count: allCourses?.length || 0 },
              { key: "linked" as const, label: "Linked", count: linkedSharedCourses.length },
              { key: "joinable" as const, label: "Join", count: filteredJoinable.length },
            ]).map((tab) => (
              <TouchableOpacity
                key={tab.key}
                className={`flex-1 py-2 rounded-lg items-center ${activeTab === tab.key ? "bg-white" : ""}`}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text className={`text-sm font-medium ${activeTab === tab.key ? "text-primary" : "text-muted-foreground"}`}>
                  {tab.label} {tab.count > 0 && `(${tab.count})`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Pending Requests */}
          {pendingRequests && pendingRequests.length > 0 && (
            <View className="bg-amber-50 rounded-2xl p-4 border border-amber-200 mb-2">
              <Text className="text-amber-800 font-semibold text-sm mb-1">Pending Requests</Text>
              <Text className="text-amber-700 text-xs mb-3">
                These requests need approval from your programme-mates at the same level.
              </Text>
              {pendingRequests.map((req: PendingSharedRequest) => (
                <View key={req.id} className="bg-white rounded-xl p-3 mb-2 border border-amber-200">
                  <Text className="font-mono text-sm font-medium text-foreground">
                    {req.action_type === "join" ? "Join" : "Remove"} {req.course.code}
                  </Text>
                  <Text className="text-xs text-muted-foreground mt-0.5">{req.course.title}</Text>
                  <Text className="text-xs text-muted-foreground mt-1">
                    By {req.requester.full_name} · {req.voteCounts.approve} approve · {req.voteCounts.reject} reject
                  </Text>
                  {req.userVoted ? (
                    <Text className="text-xs text-muted-foreground italic mt-2">
                      You voted {req.userVote === "approve" ? "to approve" : "to reject"}
                    </Text>
                  ) : req.requester_id !== profileId ? (
                    <View className="flex-row gap-2 mt-2">
                      <TouchableOpacity
                        className="flex-1 bg-green-100 rounded-lg py-2 items-center"
                        disabled={votingId === req.id}
                        onPress={() => handleVote(req.id, "approve")}
                      >
                        <View className="flex-row items-center gap-1">
                          <ThumbsUp size={14} color="#166534" />
                          <Text className="text-green-800 text-xs font-medium">Approve</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="flex-1 bg-red-100 rounded-lg py-2 items-center"
                        disabled={votingId === req.id}
                        onPress={() => handleVote(req.id, "reject")}
                      >
                        <View className="flex-row items-center gap-1">
                          <ThumbsDown size={14} color="#991B1B" />
                          <Text className="text-red-800 text-xs font-medium">Reject</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          )}

          {/* All Courses Tab */}
          {activeTab === "all" && filtered.map((course) => (
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

          {/* Linked Shared Tab */}
          {activeTab === "linked" && (
            <>
              {linkedSharedCourses.length === 0 ? (
                <Text className="text-muted-foreground text-sm text-center py-8">No linked shared courses.</Text>
              ) : (
                linkedSharedCourses.map((course) => {
                  const hasPendingLeave = pendingLeaveCourseIds.has(course.id);
                  return (
                    <View
                      key={course.id}
                      className="bg-white/90 rounded-2xl p-4 shadow-sm"
                      style={{ shadowColor: "rgba(63,39,50,0.06)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12 }}
                    >
                      <TouchableOpacity onPress={() => router.push(`/course/${course.id}`)}>
                        <View className="flex-row items-center gap-2">
                          <Text className="font-mono font-bold text-primary text-sm">{course.code}</Text>
                          <View className="bg-secondary rounded-full px-2 py-0.5">
                            <Text className="text-secondary-foreground text-[10px] font-semibold">Shared</Text>
                          </View>
                        </View>
                        <Text className="text-foreground font-medium mt-1" numberOfLines={1}>{course.title}</Text>
                        <Text className="text-muted-foreground text-xs mt-1">
                          Level {course.level} · {questionCounts?.[course.id] || 0} questions
                        </Text>
                      </TouchableOpacity>
                      {hasPendingLeave ? (
                        <Text className="text-amber-600 text-xs italic mt-2">Removal pending — awaiting votes</Text>
                      ) : (
                        <TouchableOpacity
                          className="mt-2 bg-red-50 rounded-lg py-2 px-3 flex-row items-center justify-center gap-1"
                          disabled={leavingId === course.id}
                          onPress={() => handleLeaveShared(course.id)}
                        >
                          <Unlink size={14} color="#991B1B" />
                          <Text className="text-red-800 text-xs font-medium">
                            {leavingId === course.id ? "Requesting..." : "Request removal"}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })
              )}
            </>
          )}

          {/* Joinable Tab */}
          {activeTab === "joinable" && (
            <>
              {filteredJoinable.length === 0 ? (
                <Text className="text-muted-foreground text-sm text-center py-8">No shared courses available to join.</Text>
              ) : (
                filteredJoinable.map((course) => (
                  <View
                    key={course.id}
                    className="bg-white/90 rounded-2xl p-4 shadow-sm"
                    style={{ shadowColor: "rgba(63,39,50,0.06)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12 }}
                  >
                    <TouchableOpacity onPress={() => router.push(`/course/${course.id}`)}>
                      <View className="flex-row items-center gap-2">
                        <Text className="font-mono font-bold text-primary text-sm">{course.code}</Text>
                        <View className="bg-secondary rounded-full px-2 py-0.5">
                          <Text className="text-secondary-foreground text-[10px] font-semibold">Shared</Text>
                        </View>
                      </View>
                      <Text className="text-foreground font-medium mt-1" numberOfLines={1}>{course.title}</Text>
                      <Text className="text-muted-foreground text-xs mt-1">
                        Level {course.level}
                      </Text>
                    </TouchableOpacity>
                    <View className="flex-row gap-2 mt-2">
                      <TouchableOpacity
                        className="flex-1 bg-secondary/10 rounded-lg py-2 px-3 flex-row items-center justify-center gap-1"
                        onPress={() => router.push(`/course/${course.id}`)}
                      >
                        <Text className="text-secondary text-xs font-medium">View</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="flex-1 bg-primary rounded-lg py-2 px-3 flex-row items-center justify-center gap-1"
                        disabled={joiningId === course.id}
                        onPress={() => handleJoinShared(course.id)}
                      >
                        <Link2 size={14} color="white" />
                        <Text className="text-primary-foreground text-xs font-medium">
                          {joiningId === course.id ? "Requesting..." : "Join"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </>
          )}
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
              {programmesLoading ? (
                <ActivityIndicator size="small" />
              ) : programmes && programmes.length > 0 ? (
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
                <Text className="text-muted-foreground text-sm">No programmes found for this faculty</Text>
              )}
            </View>
          ) : null}

          {selectedProgramme ? (
            <View>
              <Text className="text-sm font-semibold text-foreground mb-1.5">Course</Text>
              {coursesLoading ? (
                <ActivityIndicator size="small" />
              ) : exploreCourses && exploreCourses.length > 0 ? (
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
                <Text className="text-muted-foreground text-sm">No courses found for this programme</Text>
              )}
            </View>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}
