import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email) {
      Alert.alert("Email required", "Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "eqb://(auth)/reset-password",
      });
      if (error) throw error;

      Alert.alert("Check your email", "If an account exists, you'll receive a password reset link.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white justify-center px-6">
      <Text className="text-3xl font-bold text-gray-900 mb-2">Reset password</Text>
      <Text className="text-gray-500 mb-8">
        Enter your email and we'll send you a reset link
      </Text>

      <TextInput
        className="border border-gray-300 rounded-lg px-4 py-3 text-base"
        placeholder="you@university.edu.ng"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <TouchableOpacity
        className="bg-primary py-3.5 rounded-lg items-center mt-4"
        onPress={handleReset}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-semibold text-base">Send Reset Link</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity className="mt-4 items-center" onPress={() => router.back()}>
        <Text className="text-primary">Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
}
