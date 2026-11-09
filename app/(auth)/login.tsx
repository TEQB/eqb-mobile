import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Image } from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@/lib/validations";
import { useAuth } from "@/providers/AuthProvider";
import { Eye, EyeOff, ArrowRight } from "lucide-react-native";

type LoginForm = { email: string; password: string };

export default function LoginScreen() {
  const router = useRouter();
  const { supabase } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    setLoading(false);
    if (error) {
      Alert.alert("Login failed", error.message);
      return;
    }
    router.replace("/(tabs)/home");
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View className="flex-1 justify-center px-5">
        <View className="items-center mb-4">
          <Image source={require("@/assets/logo.png")} className="h-16 w-44" resizeMode="contain" />
          <Text className="text-xs text-muted-foreground mt-1">Built by students, for students.</Text>
        </View>

        <View className="rounded-[2rem] bg-white/90 px-5 py-8 shadow-lg" style={{ shadowColor: "rgba(122,16,48,0.08)", shadowOffset: { width: 0, height: 18 }, shadowOpacity: 1, shadowRadius: 45 }}>
          <View className="items-center mb-6">
            <Text className="text-xs font-semibold uppercase tracking-[0.22em] text-secondary">Log In</Text>
            <Text className="mt-3 text-3xl font-extrabold tracking-tight text-primary">Welcome back</Text>
            <Text className="mt-2 text-sm leading-6 text-muted-foreground text-center">
              Enter your university email and password to pick up where you left off.
            </Text>
          </View>

          <View className="gap-4">
            <View>
              <Text className="text-sm font-semibold text-foreground mb-1.5">Email</Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="h-12 rounded-xl border border-input bg-white/90 px-4 text-foreground"
                    placeholder="you@university.edu.ng"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.email && <Text className="text-destructive text-xs mt-1">{errors.email.message}</Text>}
            </View>

            <View>
              <Text className="text-sm font-semibold text-foreground mb-1.5">Password</Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View className="relative">
                    <TextInput
                      className="h-12 rounded-xl border border-input bg-white/90 px-4 pr-12 text-foreground"
                      placeholder="Your password"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry={!showPassword}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
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
              <TouchableOpacity onPress={() => router.push("/(auth)/forgot-password")} className="mt-1.5 self-end">
                <Text className="text-xs font-medium text-secondary">Forgot password?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              className="bg-primary py-4 rounded-xl items-center mt-2"
              onPress={() => handleSubmit(onSubmit)()}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-primary-foreground font-semibold text-base">Log In</Text>
              )}
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center gap-3 my-6">
            <View className="h-px flex-1 bg-border" />
            <Text className="text-sm text-muted-foreground">or</Text>
            <View className="h-px flex-1 bg-border" />
          </View>

          <View className="flex-row justify-center items-center">
            <Text className="text-sm text-muted-foreground">Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/register")} className="flex-row items-center">
              <Text className="text-sm font-semibold text-secondary">Create one</Text>
              <ArrowRight size={14} color="#D4750A" className="ml-0.5" />
            </TouchableOpacity>
          </View>
        </View>

        <Text className="mt-5 text-center text-xs text-muted-foreground">© 2025 EQB</Text>
      </View>
    </KeyboardAvoidingView>
  );
}
