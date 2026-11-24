import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform,
  Alert, ActivityIndicator, ScrollView, Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema } from "@/lib/validations";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getUniversityEmailDomain } from "@/lib/env";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react-native";
import { Select } from "@/components/ui/Select";
import { MatricInput } from "@/components/auth/MatricInput";

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
  const [error, setError] = useState("");

  const { control, handleSubmit, watch, setValue, getValues, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema) as any,
    defaultValues: { fullName: "", email: "", matricNumber: "", facultyId: "", programmeId: "", currentLevel: 0 },
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
  const universityDomain = getUniversityEmailDomain();

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
      const { data, error } = await supabase
        .from("programmes")
        .select("id, name, faculty_id, available_levels")
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string; faculty_id: string; available_levels: number[] }[];
    },
    enabled: !!watchFacultyId,
  });

  const filteredProgrammes = allProgrammes?.filter((p) => p.faculty_id === watchFacultyId) || [];

  // Get available levels for the selected programme
  const selectedProgramme = allProgrammes?.find((p) => p.id === watchProgrammeId);
  const availableLevels = selectedProgramme?.available_levels ?? [];

  const facultyOptions = (faculties ?? []).map((f) => ({ label: f.name, value: f.id }));
  const programmeOptions = filteredProgrammes.map((p) => ({ label: p.name, value: p.id }));
  const levelOptions = availableLevels.map((l) => ({ label: `${l} Level`, value: String(l) }));

  // Cascading resets matching web: changing faculty clears programme + level,
  // changing programme clears level
  useEffect(() => {
    setValue("programmeId", "");
    setValue("currentLevel", 0);
  }, [watchFacultyId, setValue]);

  useEffect(() => {
    setValue("currentLevel", 0);
  }, [watchProgrammeId, setValue]);

  const onSubmit = async (data: RegisterForm) => {
    setError("");
    setLoading(true);
    try {
      await api.post("/api/auth/send-otp", {
        email: data.email,
        fullName: data.fullName,
        matricNumber: data.matricNumber || undefined,
        programmeId: data.programmeId,
        currentLevel: data.currentLevel,
      });

      router.push({
        pathname: "/(auth)/register/verify",
        params: { email: data.email },
      });
    } catch (err: any) {
      const msg = err.message?.replace(/^API \d+: /, "") || "Registration failed";
      setError(msg);
      Alert.alert("Registration failed", msg);
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
                <Text className="text-sm font-semibold text-foreground mb-1.5">Full name</Text>
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
                <Text className="text-sm font-semibold text-foreground mb-1.5">{isOpenLevel ? "Email" : "University email"}</Text>
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      className="h-12 rounded-xl border border-input bg-white/90 px-4 text-foreground"
                      placeholder={isOpenLevel ? "you@example.com" : universityDomain ? `you@${universityDomain.replace(/^@/, "")}` : "you@university.edu.ng"}
                      placeholderTextColor="#9CA3AF"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      onBlur={() => {
                        onBlur();
                        if (isOpenLevel) {
                          setError("");
                          return;
                        }
                        const domain = universityDomain;
                        const val = (getValues("email") || "").trim();
                        if (domain && val && !val.toLowerCase().endsWith(domain.toLowerCase())) {
                          setError(`Only ${domain} emails are accepted`);
                        } else {
                          setError("");
                        }
                      }}
                      onChangeText={onChange}
                      value={value}
                    />
                  )}
                />
                {errors.email && <Text className="text-destructive text-xs mt-1">{errors.email.message}</Text>}
              </View>

              <View>
                <Text className="text-sm font-semibold text-foreground mb-1.5">
                  {isOpenLevel ? "Reg number" : "Matric number"}{!isOpenLevel ? <Text className="text-destructive"> *</Text> : null}
                </Text>
                <Controller
                  control={control}
                  name="matricNumber"
                  render={({ field: { onChange, onBlur, value } }) =>
                    isOpenLevel ? (
                      <TextInput
                        className="h-12 rounded-xl border border-input bg-white/90 px-4 text-foreground uppercase"
                        placeholder="e.g. 202330898491GA"
                        placeholderTextColor="#9CA3AF"
                        autoCapitalize="characters"
                        onBlur={onBlur}
                        onChangeText={(t) => onChange(t.toUpperCase())}
                        value={value ?? ""}
                      />
                    ) : (
                      <MatricInput value={value ?? ""} onChange={onChange} onBlur={onBlur} />
                    )
                  }
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
                    <Select
                      value={watchFacultyId || undefined}
                      onValueChange={(v) => setValue("facultyId", v)}
                      options={facultyOptions}
                      placeholder="Select faculty"
                    />
                    {errors.facultyId && <Text className="text-destructive text-xs mt-1">{errors.facultyId.message}</Text>}
                  </View>

                  <View>
                    <Text className="text-sm font-semibold text-foreground mb-1.5">Programme</Text>
                    <Select
                      value={watchProgrammeId || undefined}
                      onValueChange={(v) => setValue("programmeId", v)}
                      options={programmeOptions}
                      placeholder="Select programme"
                      disabled={!watchFacultyId}
                    />
                    {errors.programmeId && <Text className="text-destructive text-xs mt-1">{errors.programmeId.message}</Text>}
                  </View>

                  <View>
                    <Text className="text-sm font-semibold text-foreground mb-1.5">Current level</Text>
                    <Select
                      value={watchCurrentLevel ? String(watchCurrentLevel) : undefined}
                      onValueChange={(v) => setValue("currentLevel", Number(v))}
                      options={levelOptions}
                      placeholder="Select level"
                      disabled={!watchProgrammeId}
                    />
                    {errors.currentLevel && <Text className="text-destructive text-xs mt-1">{errors.currentLevel.message}</Text>}
                  </View>
                </View>
              </View>

              {error ? <Text className="text-destructive text-sm">{error}</Text> : null}

              <TouchableOpacity
                className="bg-primary py-4 rounded-xl items-center mt-2"
                onPress={() => handleSubmit(onSubmit)()}
                disabled={loading}
              >
                {loading ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator color="white" size="small" />
                    <Text className="text-primary-foreground font-semibold text-base ml-2">Sending code...</Text>
                  </View>
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
