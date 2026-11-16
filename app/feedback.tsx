import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { MessageSquare } from "lucide-react-native";

export default function FeedbackScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = getSupabaseClient();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (message.length < 10) {
      Alert.alert("Too short", "Please write at least 10 characters");
      return;
    }
    if (message.length > 2000) {
      Alert.alert("Too long", "Please keep feedback under 2000 characters");
      return;
    }

    setSending(true);
    try {
      // Get access token for Bearer auth
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        Alert.alert("Error", "Please log in again.");
        return;
      }

      const res = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL || "https://www.eqb.info"}/api/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any)?.error || `Request failed (${res.status})`);
      }

      Alert.alert("Thank you!", "Your feedback has been submitted.", [
        { text: "OK", onPress: () => router.back() },
      ]);
      setMessage("");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to submit feedback");
    } finally {
      setSending(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <View className="px-6 pt-14 pb-4">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-primary mb-2">← Back</Text>
        </TouchableOpacity>
        <View className="flex-row items-center gap-2">
          <MessageSquare size={24} color="#DC2626" />
          <Text className="text-2xl font-bold text-gray-900">Send Feedback</Text>
        </View>
        <Text className="text-gray-500 mt-1">
          Help us improve EQB — report bugs, suggest features, or share your thoughts
        </Text>
      </View>

      <View className="px-6">
        <TextInput
          className="border border-gray-300 rounded-lg px-4 py-3 text-base min-h-[160px]"
          placeholder="Write your feedback here..."
          multiline
          textAlignVertical="top"
          value={message}
          onChangeText={setMessage}
          maxLength={2000}
        />
        <Text className="text-gray-400 text-sm mt-1 text-right">
          {message.length}/2000
        </Text>

        <TouchableOpacity
          className="bg-primary py-3.5 rounded-lg items-center mt-4"
          onPress={handleSubmit}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-base">Submit Feedback</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
