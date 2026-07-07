import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function VerifyOtpScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert("Invalid code", "Please enter the 6-digit code sent to your email");
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.verifyOtp({
        email: email!,
        token: code,
        type: "signup",
      });

      if (error) throw error;

      router.push({
        pathname: "/(auth)/register/set-password",
        params: { email },
      });
    } catch (err: any) {
      Alert.alert("Verification failed", err.message || "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white justify-center px-6">
      <Text className="text-3xl font-bold text-gray-900 mb-2">Verify your email</Text>
      <Text className="text-gray-500 mb-8">
        Enter the 6-digit code sent to {email}
      </Text>

      <TextInput
        className="border border-gray-300 rounded-lg px-4 py-3 text-base text-center text-2xl tracking-widest"
        placeholder="000000"
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={setCode}
      />

      <TouchableOpacity
        className="bg-primary py-3.5 rounded-lg items-center mt-6"
        onPress={handleVerify}
        disabled={loading || code.length !== 6}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-semibold text-base">Verify Code</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
