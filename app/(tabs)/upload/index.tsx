import { useState } from "react";
import {
  View, Text, TouchableOpacity, ActivityIndicator, Alert, Image, ScrollView, TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getApiBaseUrl } from "@/lib/env";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { X, Upload as UploadIcon, FileText, Image as ImageIcon, Camera } from "lucide-react-native";

interface Course {
  id: string;
  code: string;
  title: string;
}

interface SelectedFile {
  uri: string;
  name: string;
  mimeType: string;
}

const LEVELS = [100, 200, 300, 400, 500, 600];

export default function UploadTabScreen() {
  const { user } = useAuth();
  const supabase = getSupabaseClient();
  const API_BASE = getApiBaseUrl();

  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [courseId, setCourseId] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [semester, setSemester] = useState<"first" | "second">("first");
  const [activeLevel, setActiveLevel] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: courses } = useQuery({
    queryKey: ["courses", "upload", activeLevel],
    queryFn: async () => {
      if (!activeLevel) return [];
      const { data, error } = await supabase
        .from("courses")
        .select("id, code, title")
        .eq("level", activeLevel)
        .order("code");
      if (error) throw error;
      return (data as Course[]) || [];
    },
    enabled: !!activeLevel,
  });

  const { data: lockInfo } = useQuery({
    queryKey: ["upload-lock", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("is_locked, lock_reason")
        .eq("auth_user_id", user!.id)
        .single();
      if (error) return null;
      return data as { is_locked: boolean; lock_reason: string | null } | null;
    },
    enabled: !!user,
  });

  const pickFromCamera = async () => {
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedFile({ uri: asset.uri, name: asset.fileName || "photo.jpg", mimeType: asset.mimeType || "image/jpeg" });
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedFile({ uri: asset.uri, name: asset.fileName || "photo.jpg", mimeType: asset.mimeType || "image/jpeg" });
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/*"] });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType || "application/pdf" });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !courseId || !year || !activeLevel) {
      Alert.alert("Missing fields", "Please select a file, level, course, and year");
      return;
    }

    setUploading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, current_level")
        .eq("auth_user_id", user!.id)
        .single();

      const fileExt = selectedFile.name.split(".").pop() || "jpg";
      const filePath = `${user!.id}/${Date.now()}.${fileExt}`;

      const file = new File(selectedFile.uri);
      const fileBytes = await file.base64();
      const fileBuffer = Uint8Array.from(atob(fileBytes!), (c: string) => c.charCodeAt(0));

      const { error: uploadError } = await supabase.storage
        .from("pending")
        .upload(filePath, fileBuffer, { contentType: selectedFile.mimeType });

      if (uploadError) throw uploadError;

      const { data: question, error: insertError } = await supabase
        .from("past_questions")
        .insert({
          course_id: courseId,
          year: Number(year),
          semester,
          file_url: filePath,
          file_type: selectedFile.mimeType === "application/pdf" ? "pdf" : "image",
          level: activeLevel,
          uploaded_by: (profile as any)?.id,
        } as any)
        .select()
        .single();

      if (insertError) throw insertError;

      const course = courses?.find((c: Course) => c.id === courseId);

      const res = await fetch(`${API_BASE}/api/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: (question as any).id,
          courseCode: course?.code || "",
          courseName: course?.title || "",
        }),
      });

      const result = (await res.json()) as { pass: boolean; reason: string };

      if (result.pass) {
        Alert.alert("Uploaded!", "Your question passed moderation and is now live.", [
          { text: "OK" },
        ]);
      } else {
        Alert.alert("Needs review", result.reason || "Your question is pending review.");
      }

      setSelectedFile(null);
      setCourseId("");
      setYear(String(new Date().getFullYear()));
      setSemester("first");
      setActiveLevel(null);
    } catch (err: any) {
      Alert.alert("Upload failed", err.message || "Something went wrong");
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="px-5 pt-5 pb-2">
        <Text className="text-foreground text-2xl font-bold">Upload Question</Text>
        <Text className="text-muted-foreground text-sm mt-1">Share past questions with your peers</Text>
      </View>

      {lockInfo?.is_locked && (
        <View
          style={{ backgroundColor: "#FEF2F2", borderColor: "#FECACA", borderWidth: 1 }}
          className="mx-5 mb-3 rounded-2xl px-4 py-3"
        >
          <Text className="text-sm font-semibold" style={{ color: "#DC2626" }}>
            Your account access is restricted
          </Text>
          <Text className="text-sm mt-1" style={{ color: "#991B1B" }}>
            {lockInfo.lock_reason && lockInfo.lock_reason.trim()
              ? `${lockInfo.lock_reason.trim()} — upload a past question to regain full access to EQB.`
              : "You haven't uploaded a past question within the required period. Upload one to regain full access to EQB."}
          </Text>
        </View>
      )}

      <View className="px-5 pb-8 gap-4">
        <View>
          <Text className="text-sm font-semibold text-foreground mb-2">Level</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {LEVELS.map((lvl) => (
                <TouchableOpacity
                  key={lvl}
                  className={`px-5 py-2.5 rounded-full ${activeLevel === lvl ? "bg-primary" : "bg-muted"}`}
                  onPress={() => { setActiveLevel(lvl); setCourseId(""); }}
                >
                  <Text className={activeLevel === lvl ? "text-primary-foreground font-medium text-sm" : "text-foreground text-sm"}>
                    Level {lvl}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {selectedFile ? (
          <View className="bg-white/90 rounded-2xl p-4 flex-row items-center">
            {selectedFile.mimeType === "application/pdf" ? (
              <FileText size={32} color="#7A1030" />
            ) : (
              <Image source={{ uri: selectedFile.uri }} className="w-12 h-12 rounded-xl" />
            )}
            <Text className="flex-1 ml-3 text-foreground" numberOfLines={1}>{selectedFile.name}</Text>
            <TouchableOpacity className="p-1" onPress={() => setSelectedFile(null)}>
              <X size={20} color="#6C5560" />
            </TouchableOpacity>
          </View>
        ) : (
          <View className="flex-row gap-3">
            <TouchableOpacity className="flex-1 bg-white/90 p-4 rounded-2xl items-center" onPress={pickFromCamera}>
              <Camera size={28} color="#7A1030" />
              <Text className="text-foreground text-sm font-medium mt-2">Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 bg-white/90 p-4 rounded-2xl items-center" onPress={pickFromGallery}>
              <ImageIcon size={28} color="#D4750A" />
              <Text className="text-foreground text-sm font-medium mt-2">Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 bg-white/90 p-4 rounded-2xl items-center" onPress={pickDocument}>
              <FileText size={28} color="#3F2732" />
              <Text className="text-foreground text-sm font-medium mt-2">PDF</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeLevel && courses && courses.length > 0 && (
          <View>
            <Text className="text-sm font-semibold text-foreground mb-2">Course</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {courses.map((c: Course) => (
                  <TouchableOpacity
                    key={c.id}
                    className={`px-4 py-2.5 rounded-full ${courseId === c.id ? "bg-primary" : "bg-muted"}`}
                    onPress={() => setCourseId(c.id)}
                  >
                    <Text className={courseId === c.id ? "text-primary-foreground font-medium text-sm" : "text-foreground text-sm"}>
                      {c.code}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {activeLevel && (
          <View>
            <Text className="text-sm font-semibold text-foreground mb-2">Year</Text>
            <TextInput
              className="h-12 rounded-xl border border-input bg-white/90 px-4 text-foreground"
              placeholder="2024"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              value={year}
              onChangeText={setYear}
            />
          </View>
        )}

        {activeLevel && (
          <View>
            <Text className="text-sm font-semibold text-foreground mb-2">Semester</Text>
            <View className="flex-row gap-3">
              {(["first", "second"] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  className={`flex-1 py-3 rounded-xl items-center ${semester === s ? "bg-primary" : "bg-muted"}`}
                  onPress={() => setSemester(s)}
                >
                  <Text className={semester === s ? "text-primary-foreground font-medium" : "text-foreground"}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {activeLevel && courseId && (
          <TouchableOpacity
            className="bg-primary py-4 rounded-2xl items-center mt-2"
            onPress={handleUpload}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="white" />
            ) : (
              <View className="flex-row items-center">
                <UploadIcon size={20} color="white" />
                <Text className="text-primary-foreground font-semibold text-base ml-2">Upload for Review</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}
