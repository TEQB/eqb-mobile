import { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput,
  Alert, Modal, KeyboardAvoidingView, Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { studyGroupsApi } from "@/lib/studyGroups";
import { getSupabaseClient } from "@/lib/supabase/client";
import { MessageCircle, Plus, Users, ChevronRight, X } from "lucide-react-native";

export default function CourseGroupsScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: course } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, code, title, level").eq("id", courseId!).single();
      return data as { id: string; code: string; title: string; level: number };
    },
    enabled: !!courseId,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["study-groups-course", courseId],
    queryFn: () => studyGroupsApi.listForCourse(courseId!),
    enabled: !!courseId,
  });

  const groups = data?.groups ?? [];
  const canCreate = groups.length < 2;

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Please give the group a name.");
      return;
    }
    setCreating(true);
    try {
      const res = await studyGroupsApi.create({
        course_id: courseId!,
        name: name.trim(),
        description: description.trim() || undefined,
      });
      Alert.alert("Group created!", `"${res.group.name}" is live. Invite classmates with the QR code.`);
      setCreateOpen(false);
      setName("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["study-groups-course", courseId] });
      queryClient.invalidateQueries({ queryKey: ["study-groups-mine"] });
      router.push(`/group/${res.group.id}`);
    } catch (err: any) {
      Alert.alert("Could not create", err.message || "Please try again");
    } finally {
      setCreating(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View className="bg-white px-5 pt-12 pb-4 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="mb-2">
          <Text className="text-primary">← Back</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-foreground">Study Groups</Text>
        <Text className="text-muted-foreground mt-1">
          {course ? `${course.code} — ${course.title}` : "Loading..."}
        </Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Groups for this course ({groups.length}/2)
        </Text>

        {isLoading ? (
          <ActivityIndicator size="large" className="mt-8" />
        ) : (
          <View className="gap-3">
            {groups.map((g) => (
              <TouchableOpacity
                key={g.id}
                className="bg-white/90 rounded-2xl p-4 flex-row items-center shadow-sm"
                style={{ shadowColor: "rgba(63,39,50,0.06)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12 }}
                onPress={() => router.push(`/group/${g.id}`)}
              >
                <View className="w-11 h-11 bg-primary/10 rounded-xl items-center justify-center">
                  <MessageCircle size={20} color="#7A1030" />
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-foreground font-semibold" numberOfLines={1}>{g.name}</Text>
                  {g.description && (
                    <Text className="text-muted-foreground text-xs mt-0.5" numberOfLines={1}>{g.description}</Text>
                  )}
                  <View className="flex-row items-center gap-2 mt-1">
                    <Users size={12} color="#9CA3AF" />
                    <Text className="text-muted-foreground text-xs">{g.member_count ?? 0} members</Text>
                    {g.is_member && (
                      <View className="bg-primary/10 rounded-full px-2 py-0.5">
                        <Text className="text-primary text-[10px] font-semibold">Joined</Text>
                      </View>
                    )}
                  </View>
                </View>
                <ChevronRight size={18} color="#9CA3AF" />
              </TouchableOpacity>
            ))}

            {groups.length === 0 && (
              <View className="bg-white/90 rounded-2xl p-6 items-center">
                <MessageCircle size={32} color="#D1D5DB" />
                <Text className="text-muted-foreground text-center mt-2">
                  No study groups for this course yet. Be the first to create one!
                </Text>
              </View>
            )}
          </View>
        )}

        {canCreate && !isLoading && (
          <TouchableOpacity
            className="mt-4 bg-primary rounded-2xl py-4 flex-row items-center justify-center gap-2"
            onPress={() => setCreateOpen(true)}
          >
            <Plus size={20} color="white" />
            <Text className="text-primary-foreground font-semibold">Create study group</Text>
          </TouchableOpacity>
        )}
        {!canCreate && !isLoading && (
          <View className="mt-4 bg-muted rounded-2xl p-4">
            <Text className="text-muted-foreground text-center text-sm">
              Maximum of 2 groups per course. Join an existing group above.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Create modal */}
      <Modal visible={createOpen} animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <KeyboardAvoidingView
          className="flex-1 bg-background"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View className="flex-row items-center justify-between px-5 pt-12 pb-4 border-b border-border">
            <Text className="text-xl font-bold text-foreground">Create group</Text>
            <TouchableOpacity onPress={() => setCreateOpen(false)}>
              <X size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <View className="px-5 pt-4 gap-4">
            <View>
              <Text className="text-sm font-semibold text-foreground mb-1.5">Group name</Text>
              <TextInput
                className="h-12 rounded-xl border border-input bg-white px-4 text-foreground"
                placeholder="e.g. CSC301 Night Owls"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
                maxLength={80}
              />
            </View>
            <View>
              <Text className="text-sm font-semibold text-foreground mb-1.5">Description (optional)</Text>
              <TextInput
                className="rounded-xl border border-input bg-white px-4 py-3 text-foreground min-h-[80px]"
                placeholder="What is this group about?"
                placeholderTextColor="#9CA3AF"
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={500}
              />
            </View>
            <TouchableOpacity
              className="bg-primary py-4 rounded-xl items-center mt-2"
              onPress={handleCreate}
              disabled={creating}
            >
              {creating ? <ActivityIndicator color="white" /> : <Text className="text-primary-foreground font-semibold">Create group</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}
