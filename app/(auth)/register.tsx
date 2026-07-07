import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform,
  Alert, ActivityIndicator, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema } from "@/lib/validations";
import { getSupabaseClient } from "@/lib/supabase/client";

type RegisterForm = {
  fullName: string;
  email: string;
  matricNumber: string;
  facultyId: string;
  programmeId: string;
  currentLevel: number;
};

export default function RegisterScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema) as any,
    defaultValues: { fullName: "", email: "", matricNumber: "", facultyId: "", programmeId: "", currentLevel: 100 },
  });

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: data.email,
        options: {
          data: {
            full_name: data.fullName,
            matric_number: data.matricNumber,
            programme_id: data.programmeId,
            current_level: data.currentLevel,
          },
        },
      });

      if (error) throw error;

      // Store registration data for next steps
      router.push({
        pathname: "/(auth)/register/verify",
        params: { email: data.email, fullName: data.fullName },
      });
    } catch (err: any) {
      Alert.alert("Registration failed", err.message || "Please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView className="flex-1 px-6 pt-12">
        <Text className="text-3xl font-bold text-gray-900">Create account</Text>
        <Text className="text-gray-500 mt-2 mb-8">Join your university's past question bank</Text>

        <View className="space-y-4">
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Full Name</Text>
            <Controller
              control={control}
              name="fullName"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="border border-gray-300 rounded-lg px-4 py-3"
                  placeholder="John Doe"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.fullName && <Text className="text-red-500 text-sm">{errors.fullName.message}</Text>}
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">University Email</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="border border-gray-300 rounded-lg px-4 py-3"
                  placeholder="you@university.edu.ng"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.email && <Text className="text-red-500 text-sm">{errors.email.message}</Text>}
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Matric Number</Text>
            <Controller
              control={control}
              name="matricNumber"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="border border-gray-300 rounded-lg px-4 py-3"
                  placeholder="125/23/1/0056"
                  autoCapitalize="characters"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.matricNumber && <Text className="text-red-500 text-sm">{errors.matricNumber.message}</Text>}
          </View>

          <TouchableOpacity
            className="bg-primary py-3.5 rounded-lg items-center mt-4"
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-base">Send Verification Code</Text>
            )}
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-center mt-6 mb-10">
          <Text className="text-gray-500">Already have an account? </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-primary font-semibold">Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
