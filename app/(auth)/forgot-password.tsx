import { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform,
  Alert, ActivityIndicator, ScrollView, Image,
} from "react-native";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, ArrowLeft } from "lucide-react-native";
import { getPasswordStrength, validatePassword } from "@/lib/password";

const emailSchema = z.object({ email: z.string().email("Enter a valid email") });
const codeSchema = z.object({ code: z.string().regex(/^\d{6}$/, "Code must be 6 digits") });
const passwordSchema = z
  .object({
    password: z.string().min(1, "Password is required"),
    confirmPassword: z.string().min(1),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type Mode = "email" | "code" | "password" | "success";

const STRENGTH_COLORS = { weak: "#DC2626", medium: "#D4750A", strong: "#16a34a" } as const;
const STRENGTH_WIDTHS = { weak: "33%", medium: "66%", strong: "100%" } as const;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("email");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // OTP inputs
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timeLeft, setTimeLeft] = useState(600);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<any[]>([]);

  // Password form
  const { control, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });
  const watchPassword = watch("password");
  const strength = getPasswordStrength(watchPassword || "");

  // Countdown timer for OTP
  useEffect(() => {
    if (mode !== "code" || timeLeft <= 0) {
      if (timeLeft <= 0) setCanResend(true);
      return;
    }
    const timer = setInterval(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearInterval(timer);
  }, [mode, timeLeft]);

  // Auto-verify OTP
  useEffect(() => {
    if (mode === "code" && otp.every((d) => d !== "")) {
      handleVerifyCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, mode]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  // Step 1: Send OTP
  const handleSendOtp = async () => {
    setError("");
    if (!email.trim()) {
      setError("Enter your university email");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/auth/forgot-password", { email: email.trim(), role: "student" });
      setMode("code");
      setTimeLeft(600);
      setCanResend(false);
      setOtp(["", "", "", "", "", ""]);
    } catch (err: any) {
      const msg = err.message?.replace(/^API \d+: /, "") || "Failed to send reset code";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyCode = async () => {
    const code = otp.join("");
    if (code.length !== 6) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.post<{ success: boolean; token: string }>(
        "/api/auth/verify-reset-otp",
        { email: email.trim(), code },
      );
      setToken(res.token);
      setMode("password");
    } catch (err: any) {
      const msg = err.message?.replace(/^API \d+: /, "") || "Invalid or expired code";
      setError(msg);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Set new password
  const handleResetPassword = async (data: { password: string; confirmPassword: string }) => {
    setError("");
    const validation = validatePassword(data.password, { email: email.trim() });
    if (!validation.valid) {
      setError(validation.error);
      return;
    }
    if (data.password !== data.confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/auth/complete-password-reset", {
        email: email.trim(),
        token,
        password: data.password,
        confirmPassword: data.confirmPassword,
      });
      setMode("success");
    } catch (err: any) {
      const msg = err.message?.replace(/^API \d+: /, "") || "Failed to reset password";
      setError(msg);
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
      await api.post("/api/auth/forgot-password", { email: email.trim(), role: "student" });
    } catch {
      Alert.alert("Error", "Failed to resend code");
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyPress = (index: number, key: string) => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
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
            {/* Step 1: Email */}
            {mode === "email" && (
              <>
                <View className="items-center mb-5">
                  <Text className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Reset Password</Text>
                  <Text className="mt-3 text-3xl font-bold tracking-tight text-primary">Forgot password?</Text>
                  <Text className="mt-2 text-sm leading-6 text-muted-foreground text-center">
                    Enter your university email and we'll send you a reset code.
                  </Text>
                </View>

                <View className="gap-4">
                  <View>
                    <Text className="text-sm font-semibold text-foreground mb-1.5">University Email</Text>
                    <TextInput
                      className="h-12 rounded-xl border border-input bg-white/90 px-4 text-foreground"
                      placeholder="you@university.edu.ng"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>

                  {error ? <Text className="text-destructive text-sm">{error}</Text> : null}

                  <TouchableOpacity
                    className="bg-primary py-4 rounded-xl items-center mt-2"
                    onPress={handleSendOtp}
                    disabled={loading}
                  >
                    {loading ? <ActivityIndicator color="white" /> : <Text className="text-primary-foreground font-semibold text-base">Send Reset Code</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Step 2: OTP Code */}
            {mode === "code" && (
              <>
                <View className="items-center mb-5">
                  <Text className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Verify Code</Text>
                  <Text className="mt-3 text-3xl font-bold tracking-tight text-primary">Check your email</Text>
                  <Text className="mt-2 text-sm leading-6 text-muted-foreground text-center">
                    We sent a 6-digit code to{"\n"}
                    <Text className="font-semibold text-foreground">{email}</Text>
                  </Text>
                </View>

                <View className="gap-4">
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
                        onChangeText={(v) => handleOtpChange(i, v)}
                        onKeyPress={({ nativeEvent }) => handleOtpKeyPress(i, nativeEvent.key)}
                        selectTextOnFocus
                      />
                    ))}
                  </View>

                  <Text className="text-center text-sm text-muted-foreground">
                    {timeLeft > 0 ? (
                      <>Code expires in <Text className="font-medium text-foreground">{formatTime(timeLeft)}</Text></>
                    ) : "Code expired"}
                  </Text>

                  {error ? <Text className="text-center text-sm text-destructive">{error}</Text> : null}

                  {loading && <ActivityIndicator color="#7A1030" />}

                  {canResend && (
                    <TouchableOpacity className="items-center py-1" onPress={resendCode}>
                      <Text className="text-sm font-medium text-secondary">Resend code</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    className="items-center py-1"
                    onPress={() => { setMode("email"); setError(""); setOtp(["", "", "", "", "", ""]); }}
                  >
                    <Text className="text-sm text-muted-foreground">Change email</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Step 3: New Password */}
            {mode === "password" && (
              <>
                <View className="items-center mb-5">
                  <Text className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">New Password</Text>
                  <Text className="mt-3 text-3xl font-bold tracking-tight text-primary">Set new password</Text>
                  <Text className="mt-2 text-sm leading-6 text-muted-foreground text-center">
                    Choose a strong password for your account.
                  </Text>
                </View>

                <View className="gap-4">
                  <View>
                    <Text className="text-sm font-semibold text-foreground mb-1.5">New Password</Text>
                    <Controller
                      control={control}
                      name="password"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <View className="relative">
                          <TextInput
                            className="h-12 rounded-xl border border-input bg-white/90 px-4 pr-12 text-foreground"
                            placeholder="Min. 8 characters"
                            placeholderTextColor="#9CA3AF"
                            secureTextEntry={!showPassword}
                            onBlur={onBlur}
                            onChangeText={onChange}
                            value={value}
                            autoComplete="new-password"
                          />
                          <TouchableOpacity
                            onPress={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 items-center justify-center px-4"
                          >
                            {showPassword ? <EyeOff size={18} color="#6C5560" /> : <Eye size={18} color="#6C5560" />}
                          </TouchableOpacity>
                        </View>
                      )}
                    />
                    {errors.password && <Text className="text-destructive text-xs mt-1">{errors.password.message}</Text>}
                    {watchPassword && watchPassword.length > 0 && (
                      <View className="mt-1.5">
                        <View className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <View
                            className="h-full rounded-full"
                            style={{ backgroundColor: STRENGTH_COLORS[strength], width: STRENGTH_WIDTHS[strength] }}
                          />
                        </View>
                        <Text className="text-xs mt-0.5 capitalize" style={{ color: STRENGTH_COLORS[strength] }}>
                          Strength: {strength}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View>
                    <Text className="text-sm font-semibold text-foreground mb-1.5">Confirm Password</Text>
                    <Controller
                      control={control}
                      name="confirmPassword"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <View className="relative">
                          <TextInput
                            className="h-12 rounded-xl border border-input bg-white/90 px-4 pr-12 text-foreground"
                            placeholder="Repeat your password"
                            placeholderTextColor="#9CA3AF"
                            secureTextEntry={!showConfirm}
                            onBlur={onBlur}
                            onChangeText={onChange}
                            value={value}
                            autoComplete="new-password"
                          />
                          <TouchableOpacity
                            onPress={() => setShowConfirm(!showConfirm)}
                            className="absolute inset-y-0 right-0 items-center justify-center px-4"
                          >
                            {showConfirm ? <EyeOff size={18} color="#6C5560" /> : <Eye size={18} color="#6C5560" />}
                          </TouchableOpacity>
                        </View>
                      )}
                    />
                    {errors.confirmPassword && <Text className="text-destructive text-xs mt-1">{errors.confirmPassword.message}</Text>}
                  </View>

                  {error ? <Text className="text-destructive text-sm">{error}</Text> : null}

                  <TouchableOpacity
                    className="bg-primary py-4 rounded-xl items-center mt-2"
                    onPress={() => handleSubmit(handleResetPassword)()}
                    disabled={loading}
                  >
                    {loading ? <ActivityIndicator color="white" /> : <Text className="text-primary-foreground font-semibold text-base">Reset Password</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Success */}
            {mode === "success" && (
              <View className="items-center">
                <Text className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Success</Text>
                <Text className="mt-3 text-3xl font-bold tracking-tight text-primary">Password reset!</Text>
                <Text className="mt-2 text-sm leading-6 text-muted-foreground text-center">
                  Your password has been updated. You can now sign in with your new password.
                </Text>
                <TouchableOpacity
                  className="bg-primary py-4 rounded-xl items-center mt-6 w-full"
                  onPress={() => router.replace("/(auth)/login")}
                >
                  <Text className="text-primary-foreground font-semibold text-base">Go to Login</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Back button */}
            {mode !== "success" && (
              <TouchableOpacity
                className="flex-row justify-center items-center mt-6"
                onPress={() => router.back()}
              >
                <ArrowLeft size={14} color="#D4750A" />
                <Text className="text-sm font-semibold text-secondary ml-1">Back to login</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text className="mt-5 text-center text-xs text-muted-foreground">© 2025 EQB</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
