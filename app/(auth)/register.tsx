import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform,
  Alert, ActivityIndicator, ScrollView, Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema } from "@/lib/validations";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react-native";

type RegisterForm = {
  fullName: string;
  email: string;
  matricNumber: string;
  facultyId: string;
  programmeId: string;
  currentLevel: number;
};

const LEVELS = [100, 200, 300, 400, 500, 600];

export default function RegisterScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema) as any,
    defaultValues: { fullName: "", email: "", matricNumber: "", facultyId: "", programmeId: "", currentLevel: 100 },
  });

  const watchFacultyId = watch("facultyId");
  const watchProgrammeId = watch("programmeId");
  const watchCurrentLevel = watch("currentLevel");
  const supabase = getSupabaseClient();

  const { data: openLevelsData } = useQuery({
    queryKey: ["public-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("open_registration_levels")
        .single();
      if (error) return [];
      return (
        (data as { open_registration_levels: number[] | null } | null)
          ?.open_registration_levels ?? []
      );
    },
  });
  const openRegistrationLevels = openLevelsData ?? [];
  const isOpenLevel =
    watchCurrentLevel != null && openRegistrationLevels.includes(watchCurrentLevel);

  const { data: faculties } = useQuery({
    queryKey: ["faculties"],
    queryFn: async () => {
      const { data, error } = await supabase.from("faculties").select("id, name").order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const { data: allProgrammes } = useQuery({
    queryKey: ["programmes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("programmes").select("id, name, faculty_id").order("name");
      if (error) throw error;
      return data as { id: string; name: string; faculty_id: string }[];
    },
    enabled: !!watchFacultyId,
  });

  const filteredProgrammes = allProgrammes?.filter((p) => p.faculty_id === watchFacultyId) || [];

  const onSubmit = async (data: RegisterForm) => {
    const isOpen = openRegistrationLevels.includes(data.currentLevel);
    if (!isOpen && !data.matricNumber?.trim()) {
      Alert.alert("Matric number required", "Please enter your matric number.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: data.email,
        options: {
          data: {
            full_name: data.fullName,
            matric_number: data.matricNumber || undefined,
            programme_id: data.programmeId,
            current_level: data.currentLevel,
          },
        },
      });

      if (error) throw error;

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
              <Text className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Create Account</Text>
              <Text className="mt-3 text-3xl font-bold tracking-tight text-primary">Join the community</Text>
              <Text className="mt-2 text-sm leading-6 text-muted-foreground text-center">
                {openRegistrationLevels.length > 0
                  ? "Sign up with your email to get started. New students can use any email and add details later."
                  : "Sign up with your university email to get started."}
              </Text>
            </View>

            <View className="rounded-2xl bg-primary/5 px-4 py-3 mb-6">
              <Text className="text-sm text-primary">
                <Text className="font-semibold">Step 1:</Text> Your Details{" "}
                <Text className="text-muted-foreground">→</Text>{" "}
                <Text className="text-muted-foreground">Step 2: Verify Email</Text>
              </Text>
            </View>

            {isOpenLevel && (
              <View className="rounded-2xl bg-secondary/10 border border-secondary/30 px-4 py-3 mb-6">
                <Text className="text-sm font-semibold text-secondary">New intake registration</Text>
                <Text className="text-sm text-secondary/80 mt-1">
                  You can use any email and your matric number is optional for now.
                  Update your details in your profile once you have them.
                </Text>
              </View>
            )}

            <View className="gap-4">
              <View>
                <Text className="text-sm font-semibold text-foreground mb-1.5">Full Name</Text>
                <Controller
                  control={control}
                  name="fullName"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      className="h-12 rounded-xl border border-input bg-white/90 px-4 text-foreground"
                      placeholder="Your full name"
                      placeholderTextColor="#9CA3AF"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                  )}
                />
                {errors.fullName && <Text className="text-destructive text-xs mt-1">{errors.fullName.message}</Text>}
              </View>

              <View>
                <Text className="text-sm font-semibold text-foreground mb-1.5">{isOpenLevel ? "Email" : "University Email"}</Text>
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      className="h-12 rounded-xl border border-input bg-white/90 px-4 text-foreground"
                      placeholder={isOpenLevel ? "you@example.com" : "you@university.edu.ng"}
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
                <Text className="text-sm font-semibold text-foreground mb-1.5">
                  Matric Number{isOpenLevel ? " (optional)" : ""}
                </Text>
                <Controller
                  control={control}
                  name="matricNumber"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      className="h-12 rounded-xl border border-input bg-white/90 px-4 text-foreground"
                      placeholder="125/23/1/0056"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="characters"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                  )}
                />
                {errors.matricNumber && <Text className="text-destructive text-xs mt-1">{errors.matricNumber.message}</Text>}
              </View>

              <View className="rounded-3xl bg-white/60 p-4 border border-white/70">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground mb-3">
                  Academic Info
                </Text>

                <View className="gap-3">
                  <View>
                    <Text className="text-sm font-semibold text-foreground mb-1.5">Faculty</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {faculties && faculties.length > 0 ? (
                        <View className="flex-row gap-2">
                          {faculties.map((f) => (
                            <TouchableOpacity
                              key={f.id}
                              className={`px-4 py-2.5 rounded-full ${watchFacultyId === f.id ? "bg-primary" : "bg-muted"}`}
                              onPress={() => { setValue("facultyId", f.id); setValue("programmeId", ""); }}
                            >
                              <Text className={watchFacultyId === f.id ? "text-primary-foreground font-medium text-sm" : "text-foreground text-sm"}>
                                {f.name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : (
                        <ActivityIndicator size="small" />
                      )}
                    </ScrollView>
                    {errors.facultyId && <Text className="text-destructive text-xs mt-1">{errors.facultyId.message}</Text>}
                  </View>

                  {watchFacultyId ? (
                    <View>
                      <Text className="text-sm font-semibold text-foreground mb-1.5">Programme</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {filteredProgrammes.length > 0 ? (
                          <View className="flex-row gap-2">
                            {filteredProgrammes.map((p) => (
                              <TouchableOpacity
                                key={p.id}
                                className={`px-4 py-2.5 rounded-full ${watchProgrammeId === p.id ? "bg-primary" : "bg-muted"}`}
                                onPress={() => setValue("programmeId", p.id)}
                              >
                                <Text className={watchProgrammeId === p.id ? "text-primary-foreground font-medium text-sm" : "text-foreground text-sm"}>
                                  {p.name}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        ) : (
                          <ActivityIndicator size="small" />
                        )}
                      </ScrollView>
                      {errors.programmeId && <Text className="text-destructive text-xs mt-1">{errors.programmeId.message}</Text>}
                    </View>
                  ) : null}

                  <View>
                    <Text className="text-sm font-semibold text-foreground mb-1.5">Current Level</Text>
                    {watchFacultyId ? (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View className="flex-row gap-2">
                          {LEVELS.map((level) => (
                            <TouchableOpacity
                              key={level}
                              className={`px-5 py-2.5 rounded-full ${watchCurrentLevel === level ? "bg-primary" : "bg-muted"}`}
                              onPress={() => setValue("currentLevel", level)}
                            >
                              <Text className={watchCurrentLevel === level ? "text-primary-foreground font-medium text-sm" : "text-foreground text-sm"}>
                                {level}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </ScrollView>
                    ) : (
                      <Text className="text-sm text-muted-foreground">Select a faculty and programme first</Text>
                    )}
                    {errors.currentLevel && <Text className="text-destructive text-xs mt-1">{errors.currentLevel.message}</Text>}
                  </View>
                </View>
              </View>

              <TouchableOpacity
                className="bg-primary py-4 rounded-xl items-center mt-2"
                onPress={handleSubmit(onSubmit)}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-primary-foreground font-semibold text-base">Continue →</Text>
                )}
              </TouchableOpacity>
            </View>

            <View className="flex-row justify-center items-center mt-6">
              <Text className="text-sm text-muted-foreground">Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/login")} className="flex-row items-center">
                <Text className="text-sm font-semibold text-secondary">Log in</Text>
                <ArrowRight size={14} color="#D4750A" className="ml-0.5" />
              </TouchableOpacity>
            </View>
          </View>

          <Text className="mt-5 text-center text-xs text-muted-foreground">© 2025 EQB</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
