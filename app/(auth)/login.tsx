import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@/lib/validations";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

type LoginForm = { email: string; password: string };

export default function LoginScreen() {
  const router = useRouter();
  const { supabase } = useAuth();
  const [loading, setLoading] = useState(false);

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
    router.replace("/(tabs)/dashboard");
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white justify-center px-6"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View className="mb-10">
        <Text className="text-3xl font-bold text-gray-900">Welcome back</Text>
        <Text className="text-gray-500 mt-2">Sign in to your EQB account</Text>
      </View>

      <View className="space-y-4">
        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-base"
                placeholder="you@university.edu.ng"
                keyboardType="email-address"
                autoCapitalize="none"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.email && (
            <Text className="text-red-500 text-sm mt-1">{errors.email.message}</Text>
          )}
        </View>

        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1">Password</Text>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3 text-base"
                placeholder="Your password"
                secureTextEntry
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.password && (
            <Text className="text-red-500 text-sm mt-1">{errors.password.message}</Text>
          )}
        </View>

        <TouchableOpacity onPress={() => router.push("/(auth)/forgot-password")}>
          <Text className="text-primary text-right text-sm">Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-primary py-3.5 rounded-lg items-center mt-2"
          onPress={handleSubmit(onSubmit)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-base">Sign In</Text>
          )}
        </TouchableOpacity>
      </View>

      <View className="flex-row justify-center mt-8">
        <Text className="text-gray-500">Don't have an account? </Text>
        <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
          <Text className="text-primary font-semibold">Sign Up</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
