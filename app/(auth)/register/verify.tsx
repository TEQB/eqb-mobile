import { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform,
  Alert, ActivityIndicator, ScrollView, Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { api } from "@/lib/api";
import { ArrowLeft } from "lucide-react-native";

export default function VerifyOtpScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timeLeft, setTimeLeft] = useState(600);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<any[]>([]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Auto-verify when all 6 digits entered
  useEffect(() => {
    if (otp.every((d) => d !== "")) {
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length !== 6) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.post<{ success: boolean; hasPendingRegistration: boolean; registration: any }>(
        "/api/auth/verify-otp",
        { email, code },
      );

      if (res.hasPendingRegistration) {
        const params: Record<string, string> = { email };
        if (res.registration?.matricNumber) {
          params.matric = res.registration.matricNumber;
        }
        router.push({
          pathname: "/(auth)/register/set-password",
          params,
        });
      } else {
        router.push({
          pathname: "/(auth)/login",
          params: { verified: email },
        });
      }
    } catch (err: any) {
      const msg = err.message?.replace(/^API \d+: /, "") || "Invalid or expired code";
      setError(msg);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (!canResend) return;
    setCanResend(false);
    setTimeLeft(600);
    setOtp(["", "", "", "", "", ""]);
    setError("");
    inputRefs.current[0]?.focus();

    try {
      // Re-send OTP — the API will look up pending_registrations for this email
      await api.post("/api/auth/send-otp", { email });
      Alert.alert("Code resent", "Please check your email for a new verification code.");
    } catch {
      Alert.alert("Error", "Failed to resend code");
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
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
              {/* OTP inputs */}
              <View className="flex-row justify-center gap-2">
                {otp.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={(ref) => { inputRefs.current[i] = ref; }}
                    className="h-14 w-12 rounded-xl border border-input bg-white px-2 text-center text-xl font-semibold text-foreground"
                    style={digit ? { borderColor: "#D4750A", borderWidth: 2 } : undefined}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={digit}
                    onChangeText={(v) => handleChange(i, v)}
                    onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
                    selectTextOnFocus
                  />
                ))}
              </View>

              {/* Timer */}
              <Text className="text-center text-sm text-muted-foreground">
                {timeLeft > 0 ? (
                  <>Code expires in <Text className="font-medium text-foreground">{formatTime(timeLeft)}</Text></>
                ) : (
                  "Code expired"
                )}
              </Text>

              {error ? <Text className="text-center text-sm text-destructive">{error}</Text> : null}

              {loading && (
                <View className="items-center">
                  <ActivityIndicator color="#7A1030" />
                  <Text className="text-sm text-muted-foreground mt-1">Verifying...</Text>
                </View>
              )}

              {canResend && (
                <TouchableOpacity className="items-center py-1" onPress={resendCode}>
                  <Text className="text-sm font-medium text-secondary">Resend code</Text>
                </TouchableOpacity>
              )}
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
