import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { setPasswordSchema } from "@/lib/validations";
import { getSupabaseClient } from "@/lib/supabase/client";

type PasswordForm = { password: string; confirmPassword: string };

export default function SetPasswordScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<PasswordForm>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: PasswordForm) => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) throw error;

      Alert.alert("Account created!", "You can now sign in with your email and password.", [
        { text: "Go to Login", onPress: () => router.replace("/(auth)/login") },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to set password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white justify-center px-6">
      <Text className="text-3xl font-bold text-gray-900 mb-2">Set your password</Text>
      <Text className="text-gray-500 mb-8">Choose a strong password for your account</Text>

      <View className="space-y-4">
        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1">Password</Text>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3"
                placeholder="Min. 8 characters"
                secureTextEntry
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.password && <Text className="text-red-500 text-sm">{errors.password.message}</Text>}
        </View>

        <View>
          <Text className="text-sm font-medium text-gray-700 mb-1">Confirm Password</Text>
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-3"
                placeholder="Repeat your password"
                secureTextEntry
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.confirmPassword && (
            <Text className="text-red-500 text-sm">{errors.confirmPassword.message}</Text>
          )}
        </View>

        <TouchableOpacity
          className="bg-primary py-3.5 rounded-lg items-center mt-2"
          onPress={handleSubmit(onSubmit)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-base">Create Account</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
