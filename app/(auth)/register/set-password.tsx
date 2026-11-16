import { useState, useMemo } from "react";
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform,
  Alert, ActivityIndicator, ScrollView, Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { setPasswordSchema } from "@/lib/validations";
import { api } from "@/lib/api";
import { getPasswordStrength } from "@/lib/password";
import { Eye, EyeOff, ArrowLeft } from "lucide-react-native";

type PasswordForm = { password: string; confirmPassword: string };

const STRENGTH_COLORS = {
  weak: "#DC2626",
  medium: "#D4750A",
  strong: "#16a34a",
} as const;

const STRENGTH_WIDTHS = {
  weak: "33%",
  medium: "66%",
  strong: "100%",
} as const;

export default function SetPasswordScreen() {
  const router = useRouter();
  const { email, matric } = useLocalSearchParams<{ email: string; matric?: string }>();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");

  const { control, handleSubmit, watch, formState: { errors } } = useForm<PasswordForm>({
    resolver: zodResolver(setPasswordSchema) as any,
    defaultValues: { password: "", confirmPassword: "" },
  });

  const watchPassword = watch("password");
  const strength = useMemo(() => getPasswordStrength(watchPassword), [watchPassword]);

  const onSubmit = async (data: PasswordForm) => {
    setError("");
    setLoading(true);
    try {
      await api.post("/api/auth/create-account", {
        email,
        password: data.password,
      });

      Alert.alert("Account created!", "You can now sign in with your email and password.", [
        {
          text: "Go to Login",
          onPress: () => router.replace({
            pathname: "/(auth)/login",
            params: { confirmed: email },
          }),
        },
      ]);
    } catch (err: any) {
      const msg = err.message?.replace(/^API \d+: /, "") || "Failed to create account";
      setError(msg);
    } finally {
      setLoading(false);
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
              <Text className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Set Password</Text>
              <Text className="mt-3 text-3xl font-bold tracking-tight text-primary">Create a password</Text>
              <Text className="mt-2 text-sm leading-6 text-muted-foreground text-center">
                Choose a strong password to secure your account.
              </Text>
            </View>

            <View className="rounded-2xl bg-primary/5 px-4 py-3 mb-6">
              <Text className="text-sm text-muted-foreground">
                <Text className="font-semibold text-primary">Step 3:</Text> Set Password
              </Text>
            </View>

            <View className="gap-4">
              <View>
                <Text className="text-sm font-semibold text-foreground mb-1.5">Password</Text>
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
                {watchPassword.length > 0 && (
                  <View className="mt-1.5">
                    <View className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <View
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: STRENGTH_COLORS[strength],
                          width: STRENGTH_WIDTHS[strength],
                        }}
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
                onPress={() => handleSubmit(onSubmit)()}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-primary-foreground font-semibold text-base">Create Account</Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              className="flex-row justify-center items-center mt-6"
              onPress={() => router.push("/(auth)/register")}
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
