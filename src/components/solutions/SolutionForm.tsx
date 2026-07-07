import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { useAuth } from "@/providers/AuthProvider";
import * as DocumentPicker from "expo-document-picker";

function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

interface SolutionFormProps {
  questionId: string;
  onSubmitted: () => void;
}

export function SolutionForm({ questionId, onSubmitted }: SolutionFormProps) {
  const { supabase, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [solutionFile, setSolutionFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/jpeg", "image/png"],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.size && asset.size > 10 * 1024 * 1024) {
        setError("File must be under 10MB");
        return;
      }
      setError("");
      setSolutionFile(asset);
    }
  };

  const onSubmit = async () => {
    setError("");
    const trimmedBody = body.trim();
    if (!trimmedBody && !solutionFile) {
      setError("Add text or a file");
      return;
    }

    setIsSubmitting(true);

    if (!user) {
      setIsSubmitting(false);
      Alert.alert("Error", "Sign in to submit a solution");
      return;
    }

    const { data: rawProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();
    const profile = rawProfile as { id: string } | null;
    if (!profile) {
      setIsSubmitting(false);
      Alert.alert("Error", "Profile not found");
      return;
    }

    let fileUrl: string | null = null;
    if (solutionFile) {
      const ext = solutionFile.name?.split(".").pop() || "jpg";
      const fileId = uuidv4();
      const filePath = `${fileId}.${ext}`;

      const response = await fetch(solutionFile.uri);
      const blob = await response.blob();

      const { error: uploadErr } = await supabase.storage
        .from("solutions")
        .upload(filePath, blob);

      if (uploadErr) {
        setError("File upload failed");
        setIsSubmitting(false);
        return;
      }
      fileUrl = `solutions/${filePath}`;
    }

    const { error: insertError } = await supabase.from("solutions").insert({
      question_id: questionId,
      submitted_by: profile.id,
      body: trimmedBody || null,
      file_url: fileUrl,
      status: "published",
    } as never);

    if (insertError) {
      setError("Failed to submit solution");
      setIsSubmitting(false);
      return;
    }

    setBody("");
    setSolutionFile(null);
    setOpen(false);
    setIsSubmitting(false);
    onSubmitted();
  };

  if (!open) {
    return (
      <TouchableOpacity
        onPress={() => setOpen(true)}
        className="rounded-md border border-gray-300 bg-white px-4 py-2"
      >
        <Text className="text-sm font-medium text-gray-700">Add a solution</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      {solutionFile ? (
        <View className="flex-row items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2">
          <Text className="flex-1 text-sm text-gray-700 truncate">{solutionFile.name}</Text>
          <TouchableOpacity onPress={() => setSolutionFile(null)}>
            <Text className="text-xs font-medium text-red-600">Remove</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={pickFile}
          className="flex-row items-center justify-center gap-2 rounded-md border border-dashed border-gray-300 bg-gray-50 px-4 py-2.5"
        >
          <Text className="text-sm font-medium text-gray-600">Attach image or PDF</Text>
        </TouchableOpacity>
      )}

      <TextInput
        value={body}
        onChangeText={setBody}
        multiline
        numberOfLines={4}
        placeholder="Write your solution..."
        className="rounded-md border border-gray-300 px-3.5 py-2.5 text-base"
        textAlignVertical="top"
      />

      {error && <Text className="text-sm text-red-600">{error}</Text>}

      <View className="flex-row gap-2">
        <TouchableOpacity
          onPress={onSubmit}
          disabled={isSubmitting}
          className="rounded-md bg-primary px-4 py-2"
        >
          <Text className="text-sm font-medium text-white">
            {isSubmitting ? "Submitting..." : "Submit"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { setOpen(false); setBody(""); setSolutionFile(null); setError(""); }}
          className="rounded-md border border-gray-300 bg-white px-4 py-2"
        >
          <Text className="text-sm font-medium text-gray-700">Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
