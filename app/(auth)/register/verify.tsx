import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform,
  Alert, ActivityIndicator, ScrollView, Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { getSupabaseClient } from "@/lib/supabase/client";
import { ArrowLeft } from "lucide-react-native";

export default function VerifyOtpScreen() {
  const router = useRouter();
  const { email, fullName } = useLocalSearchParams<{ email: string; fullName: string }>();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

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

  const resendCode = async () => {
    setResending(true);
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signInWithOtp({
        email: email!,
        options: { data: { full_name: fullName } },
      });
      Alert.alert("Code resent", "Please check your email for a new verification code.");
    } catch {
      Alert.alert("Error", "Failed to resend code");
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 px-5 py-8">
          <View className="items-center mb-5">
            <Image source={require("@/assets/logo.png")} className="h-16 w-44" resizeMode="contain" />
            <Text className="text-xs text-muted-foreground mt-1">Built by students, for students.</Text>
          </View>

          <View className="rounded-[2rem] bg-white/90 px-5 py-8 shadow-lg" style={{ shadowColor: "rgba(122,16,48,0.08)", shadowOffset: { width: 0, height: 18 }, shadowOpacity: 1, shadowRadius: 45 }}>
            <View className="items-center mb-5">
              <Text className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Verify Email</Text>
              <Text className="mt-3 text-3xl font-bold tracking-tight text-primary">Check your email</Text>
              <Text className="mt-2 text-sm leading-6 text-muted-foreground text-center">
                We sent a 6-digit code to{"\n"}
                <Text className="font-semibold text-foreground">{email}</Text>
              </Text>
            </View>

            <View className="rounded-2xl bg-primary/5 px-4 py-3 mb-6">
              <Text className="text-sm text-muted-foreground">
                <Text className="font-semibold text-primary">Step 2:</Text> Verify Email
              </Text>
            </View>

            <View className="gap-4">
              <View>
                <Text className="text-sm font-semibold text-foreground mb-1.5">Verification Code</Text>
                <TextInput
                  className="h-14 rounded-xl border border-input bg-white px-4 text-foreground text-center text-2xl tracking-[0.3em]"
                  placeholder="000000"
                  placeholderTextColor="#D1C5BD"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={code}
                  onChangeText={setCode}
                />
              </View>

              <TouchableOpacity
                className="bg-primary py-4 rounded-xl items-center mt-2"
                onPress={handleVerify}
                disabled={loading || code.length !== 6}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-primary-foreground font-semibold text-base">Verify Code</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity className="items-center py-1" onPress={resendCode} disabled={resending}>
                {resending ? (
                  <ActivityIndicator size="small" color="#D4750A" />
                ) : (
                  <Text className="text-sm font-medium text-secondary">Resend code</Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              className="flex-row justify-center items-center mt-6"
              onPress={() => router.push("/(auth)/login")}
            >
              <ArrowLeft size={14} color="#D4750A" />
              <Text className="text-sm font-semibold text-secondary ml-1">Back to sign up</Text>
            </TouchableOpacity>
          </View>

          <Text className="mt-5 text-center text-xs text-muted-foreground">© 2025 EQB</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
