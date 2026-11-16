import { useState, useMemo } from "react";
import {
  View, Text, TouchableOpacity, ActivityIndicator, Alert, Image, ScrollView, TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getApiBaseUrl } from "@/lib/env";
import { useLockStatus } from "@/hooks/useLockStatus";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { X, Upload as UploadIcon, FileText, Image as ImageIcon, Camera } from "lucide-react-native";

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface Course {
  id: string;
  code: string;
  title: string;
  level: number;
  scope: string;
  programme_id: string;
}

interface SelectedFile {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function validateFile(mimeType: string, size?: number): string | null {
  if (size && size > MAX_FILE_SIZE) return "File exceeds 10MB limit";
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) return "Only PDF, JPG, and PNG files are allowed";
  return null;
}

function getFileType(mimeType: string): "pdf" | "image" {
  return mimeType === "application/pdf" ? "pdf" : "image";
}

export default function UploadTabScreen() {
  const { user } = useAuth();
  const supabase = getSupabaseClient();
  const API_BASE = getApiBaseUrl();
  const queryClient = useQueryClient();
  const { data: lockInfo } = useLockStatus();

  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [courseId, setCourseId] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [semester, setSemester] = useState<"first" | "second">("first");
  const [examType, setExamType] = useState<"mid_semester" | "examination">("examination");
  const [uploading, setUploading] = useState(false);

  // Load profile to get programme_id and current_level
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, programme_id, current_level, programme:programme_id(available_levels)")
        .eq("auth_user_id", user.id)
        .single();
      if (error) throw error;
      return data as {
        id: string;
        programme_id: string;
        current_level: number;
        programme: { available_levels: number[] } | null;
      } | null;
    },
    enabled: !!user,
  });

  const programmeId = profile?.programme_id;
  const availableLevels = profile?.programme?.available_levels ?? [];

  // Load courses for the student's programme (own + general + linked shared)
  const { data: courses } = useQuery({
    queryKey: ["courses", "upload", programmeId],
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
      const ownList = ((ownCourses as Course[] | null) || []).filter((c) => !linkedIds.has(c.id));
      const linkedList = ((links as any[] | null) || [])
        .map((l) => l.course as Course)
        .filter(Boolean);

      return [...ownList, ...linkedList].sort((a, b) => a.level - b.level);
    },
    enabled: !!programmeId,
  });

  // Filter courses by selected level (or show all if no level selected)
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    if (!selectedLevel) return courses;
    return courses.filter((c) => c.level === selectedLevel);
  }, [courses, selectedLevel]);

  const selectedCourse = courses?.find((c) => c.id === courseId);

  const pickFromCamera = async () => {
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      mediaTypes: ["images"],
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const mimeType = asset.mimeType || "image/jpeg";
      const err = validateFile(mimeType, asset.fileSize);
      if (err) {
        Alert.alert("Invalid file", err);
        return;
      }
      setSelectedFile({
        uri: asset.uri,
        name: asset.fileName || `photo-${Date.now()}.jpg`,
        mimeType,
        size: asset.fileSize,
      });
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8,
      mediaTypes: ["images"],
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const mimeType = asset.mimeType || "image/jpeg";
      const err = validateFile(mimeType, asset.fileSize);
      if (err) {
        Alert.alert("Invalid file", err);
        return;
      }
      setSelectedFile({
        uri: asset.uri,
        name: asset.fileName || `photo-${Date.now()}.jpg`,
        mimeType,
        size: asset.fileSize,
      });
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/jpeg", "image/png"],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const mimeType = asset.mimeType || "application/pdf";
      const err = validateFile(mimeType, asset.size);
      if (err) {
        Alert.alert("Invalid file", err);
        return;
      }
      setSelectedFile({
        uri: asset.uri,
        name: asset.name,
        mimeType,
        size: asset.size,
      });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !courseId || !year || !selectedCourse) {
      Alert.alert("Missing fields", "Please select a file, course, and year");
      return;
    }

    const yearNum = Number(year);
    const currentYear = new Date().getFullYear();
    if (!yearNum || yearNum < 1990 || yearNum > currentYear) {
      Alert.alert("Invalid year", `Year must be between 1990 and ${currentYear}`);
      return;
    }

    if (!profile) {
      Alert.alert("Error", "Could not load profile. Please try again.");
      return;
    }

    setUploading(true);
    let questionId: string | null = null;
    let uploadedPath: string | null = null;

    try {
      // Generate UUID for the question
      questionId = generateUUID();

      const fileType = getFileType(selectedFile.mimeType);
      const ext = fileType === "pdf" ? "pdf" : (selectedFile.name.split(".").pop() || "jpg");
      const filePath = `pending/${questionId}/page-1.${ext}`;

      // Read file and upload to Supabase storage
      const file = new File(selectedFile.uri);
      const fileBytes = await file.base64();
      const fileBuffer = Uint8Array.from(atob(fileBytes!), (c: string) => c.charCodeAt(0));

      const { error: uploadError } = await supabase.storage
        .from("pending")
        .upload(filePath, fileBuffer, { contentType: selectedFile.mimeType });

      if (uploadError) throw uploadError;
      uploadedPath = filePath;

      // Insert into past_questions
      const { error: insertError } = await supabase
        .from("past_questions")
        .insert({
          id: questionId,
          course_id: courseId,
          uploaded_by: profile.id,
          level: selectedCourse.level,
          file_url: filePath,
          file_type: fileType,
          year: yearNum,
          semester,
          exam_type: examType,
          status: "pending_review",
        } as any);

      if (insertError) throw insertError;

      // Insert into past_question_pages
      const { error: pagesError } = await supabase
        .from("past_question_pages")
        .insert({
          question_id: questionId,
          page_number: 1,
          file_url: filePath,
          file_type: fileType,
        } as any);

      if (pagesError) {
        // Rollback: delete the question and file
        await supabase.from("past_questions").delete().eq("id", questionId);
        await supabase.storage.from("pending").remove([filePath]);
        throw new Error("Failed to save pages. Please try again.");
      }

      // Call moderation API with Bearer token
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const res = await fetch(`${API_BASE}/api/moderate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          questionId,
          courseCode: selectedCourse.code,
          courseName: selectedCourse.title,
        }),
      });

      const result = (await res.json()) as { pass: boolean; reason: string };

      if (result.pass) {
        queryClient.invalidateQueries({ queryKey: ["lock-status"] });
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
      setExamType("examination");
      setSelectedLevel(null);
    } catch (err: any) {
      // Cleanup on error
      if (questionId) {
        await supabase.from("past_questions").delete().eq("id", questionId);
      }
      if (uploadedPath) {
        await supabase.storage.from("pending").remove([uploadedPath]);
      }
      Alert.alert("Upload failed", err.message || "Something went wrong");
    } finally {
      setUploading(false);
    }
  };

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, i) => currentYear - i);
  }, []);

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
        {/* Level selector — from programme's available_levels */}
        {availableLevels.length > 0 && (
          <View>
            <Text className="text-sm font-semibold text-foreground mb-2">Level</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {availableLevels.map((lvl) => (
                  <TouchableOpacity
                    key={lvl}
                    className={`px-5 py-2.5 rounded-full ${selectedLevel === lvl ? "bg-primary" : "bg-muted"}`}
                    onPress={() => { setSelectedLevel(lvl); setCourseId(""); }}
                  >
                    <Text className={selectedLevel === lvl ? "text-primary-foreground font-medium text-sm" : "text-foreground text-sm"}>
                      Level {lvl}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* File picker */}
        {selectedFile ? (
          <View className="bg-white/90 rounded-2xl p-4 flex-row items-center">
            {selectedFile.mimeType === "application/pdf" ? (
              <FileText size={32} color="#7A1030" />
            ) : (
              <Image source={{ uri: selectedFile.uri }} className="w-12 h-12 rounded-xl" />
            )}
            <View className="flex-1 ml-3">
              <Text className="text-foreground" numberOfLines={1}>{selectedFile.name}</Text>
              {selectedFile.size && (
                <Text className="text-xs text-muted-foreground mt-0.5">
                  {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                </Text>
              )}
            </View>
            <TouchableOpacity className="p-1" onPress={() => setSelectedFile(null)}>
              <X size={20} color="#6C5560" />
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text className="text-sm font-semibold text-foreground mb-2">File</Text>
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
            <Text className="text-xs text-muted-foreground mt-2 text-center">
              PDF, JPG, or PNG — max 10MB
            </Text>
          </View>
        )}

        {/* Course selector — filtered by programme */}
        {courses && courses.length > 0 && (
          <View>
            <Text className="text-sm font-semibold text-foreground mb-2">
              Course{selectedLevel ? ` (Level ${selectedLevel})` : ""}
            </Text>
            {filteredCourses.length === 0 ? (
              <Text className="text-sm text-muted-foreground">
                {selectedLevel ? `No courses available for Level ${selectedLevel}.` : "Select a level to see courses."}
              </Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {filteredCourses.map((c: Course) => (
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
            )}
            {selectedCourse && (
              <Text className="text-xs text-muted-foreground mt-1.5">
                {selectedCourse.title}
                {selectedCourse.scope === "shared" ? " · Shared course" : selectedCourse.scope === "general" ? " · General" : ""}
              </Text>
            )}
          </View>
        )}

        {/* Year selector */}
        <View>
          <Text className="text-sm font-semibold text-foreground mb-2">Academic Year</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {years.map((y) => (
                <TouchableOpacity
                  key={y}
                  className={`px-4 py-2.5 rounded-full ${year === String(y) ? "bg-primary" : "bg-muted"}`}
                  onPress={() => setYear(String(y))}
                >
                  <Text className={year === String(y) ? "text-primary-foreground font-medium text-sm" : "text-foreground text-sm"}>
                    {y}/{y + 1}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Semester selector */}
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
                  {s.charAt(0).toUpperCase() + s.slice(1)} Semester
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Exam type selector */}
        <View>
          <Text className="text-sm font-semibold text-foreground mb-2">Exam Type</Text>
          <View className="flex-row gap-3">
            {([
              { value: "examination" as const, label: "Examination" },
              { value: "mid_semester" as const, label: "Mid-semester" },
            ]).map((t) => (
              <TouchableOpacity
                key={t.value}
                className={`flex-1 py-3 rounded-xl items-center ${examType === t.value ? "bg-primary" : "bg-muted"}`}
                onPress={() => setExamType(t.value)}
              >
                <Text className={examType === t.value ? "text-primary-foreground font-medium" : "text-foreground"}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Upload button */}
        {selectedFile && courseId && year && selectedCourse && (
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
