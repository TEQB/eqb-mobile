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
import { X, Upload as UploadIcon, FileText, Image as ImageIcon } from "lucide-react-native";

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

interface ModerateResult {
  pass: boolean;
  reason: string;
}

export default function UploadScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = getSupabaseClient();
  const API_BASE = getApiBaseUrl();

  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [courseId, setCourseId] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [semester, setSemester] = useState<"first" | "second">("first");
  const [uploading, setUploading] = useState(false);

  const { data: courses } = useQuery({
    queryKey: ["courses", "upload"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, code, title")
        .order("code");
      if (error) throw error;
      return (data as Course[]) || [];
    },
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
    if (!selectedFile || !courseId || !year) {
      Alert.alert("Missing fields", "Please select a file, course, and year");
      return;
    }

    setUploading(true);
    try {
      const fileExt = selectedFile.name.split(".").pop() || "jpg";
      const filePath = `${user!.id}/${Date.now()}.${fileExt}`;

      const file = new File(selectedFile.uri);
      const fileBytes = await file.base64();
      const fileBuffer = Uint8Array.from(atob(fileBytes), (c: string) => c.charCodeAt(0));

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

      const result = (await res.json()) as ModerateResult;

      if (result.pass) {
        Alert.alert("Uploaded!", "Your question passed moderation and is now live.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Needs review", result.reason || "Your question is pending review.");
      }
    } catch (err: any) {
      Alert.alert("Upload failed", err.message || "Something went wrong");
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="px-6 pt-14 pb-4">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-primary mb-2">← Back</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-gray-900">Upload Question</Text>
      </View>

      <View className="px-6">
        {selectedFile ? (
          <View className="bg-gray-100 rounded-xl p-4 mb-4 flex-row items-center">
            {selectedFile.mimeType === "application/pdf" ? (
              <FileText size={32} color="#DC2626" />
            ) : (
              <Image source={{ uri: selectedFile.uri }} className="w-12 h-12 rounded" />
            )}
            <Text className="flex-1 ml-3 text-gray-800" numberOfLines={1}>
              {selectedFile.name}
            </Text>
            <TouchableOpacity onPress={() => setSelectedFile(null)}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        ) : (
          <View className="flex-row gap-3 mb-4">
            <TouchableOpacity
              className="flex-1 bg-gray-100 p-4 rounded-xl items-center"
              onPress={pickFromCamera}
            >
              <ImageIcon size={28} color="#DC2626" />
              <Text className="text-gray-700 mt-2">Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-gray-100 p-4 rounded-xl items-center"
              onPress={pickFromGallery}
            >
              <ImageIcon size={28} color="#3B82F6" />
              <Text className="text-gray-700 mt-2">Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-gray-100 p-4 rounded-xl items-center"
              onPress={pickDocument}
            >
              <FileText size={28} color="#10B981" />
              <Text className="text-gray-700 mt-2">PDF</Text>
            </TouchableOpacity>
          </View>
        )}

        {courses && courses.length > 0 && (
          <>
            <Text className="text-sm font-medium text-gray-700 mb-1">Course</Text>
            <ScrollView horizontal className="mb-4">
              {courses.map((c: Course) => (
                <TouchableOpacity
                  key={c.id}
                  className={`px-4 py-2 rounded-full mr-2 ${courseId === c.id ? "bg-primary" : "bg-gray-200"}`}
                  onPress={() => setCourseId(c.id)}
                >
                  <Text className={courseId === c.id ? "text-white" : "text-gray-700"}>
                    {c.code}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <Text className="text-sm font-medium text-gray-700 mb-1">Year</Text>
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
          placeholder="2024"
          keyboardType="number-pad"
          value={year}
          onChangeText={setYear}
        />

        <View className="flex-row gap-3 mb-6">
          <TouchableOpacity
            className={`flex-1 py-3 rounded-lg items-center ${semester === "first" ? "bg-primary" : "bg-gray-200"}`}
            onPress={() => setSemester("first")}
          >
            <Text className={semester === "first" ? "text-white font-medium" : "text-gray-700"}>First</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-3 rounded-lg items-center ${semester === "second" ? "bg-primary" : "bg-gray-200"}`}
            onPress={() => setSemester("second")}
          >
            <Text className={semester === "second" ? "text-white font-medium" : "text-gray-700"}>Second</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          className="bg-primary py-3.5 rounded-lg items-center mb-10"
          onPress={handleUpload}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="white" />
          ) : (
            <View className="flex-row items-center">
              <UploadIcon size={20} color="white" />
              <Text className="text-white font-semibold text-base ml-2">Upload for Review</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
