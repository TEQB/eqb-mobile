import { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Alert, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Clock, MessageSquare, LogOut, ChevronRight, Mail, BookOpen, AlertCircle, Phone } from "lucide-react-native";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [savingLevel, setSavingLevel] = useState(false);
  const [phone, setPhone] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [savingContact, setSavingContact] = useState(false);
  const [contactLoaded, setContactLoaded] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, matric_number, current_level, phone_number, bank_account_number, programmes(name, available_levels)")
        .eq("auth_user_id", user!.id)
        .single();
      if (error) throw error;
      return data as Record<string, any>;
    },
    enabled: !!user,
  });

  if (profile && !contactLoaded) {
    setPhone((profile.phone_number as string) || "");
    setAccountNumber((profile.bank_account_number as string) || "");
    setContactLoaded(true);
  }

  const handleSaveContact = async () => {
    setSavingContact(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ phone_number: phone.trim() || null, bank_account_number: accountNumber.trim() || null })
        .eq("auth_user_id", user!.id);
      if (error) throw error;
      Alert.alert("Saved", "Your contact details have been updated.");
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    } catch (err: any) {
      Alert.alert("Could not save", err.message || "Please try again");
    } finally {
      setSavingContact(false);
    }
  };

  const { data: levelChangeEnabled } = useQuery({
    queryKey: ["public-settings", "level_change"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("level_change_enabled")
        .single();
      if (error) return false;
      return (data as { level_change_enabled: boolean } | null)?.level_change_enabled ?? false;
    },
  });

  const availableLevels: number[] = profile?.programmes?.available_levels ?? [];
  const canChangeLevel = !!levelChangeEnabled && availableLevels.length > 0;

  const handleSaveLevel = async () => {
    if (selectedLevel == null) return;
    setSavingLevel(true);
    try {
      const { error } = await supabase.rpc("update_student_level", { p_level: selectedLevel });
      if (error) throw error;
      Alert.alert("Level updated", `You are now in ${selectedLevel} Level.`);
      setSelectedLevel(null);
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    } catch (err: any) {
      Alert.alert("Could not update level", err.message || "Please try again");
    } finally {
      setSavingLevel(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="items-center pt-8 pb-6 px-5">
        <View className="w-20 h-20 bg-primary rounded-full items-center justify-center mb-3 shadow-lg" style={{ shadowColor: "rgba(122,16,48,0.15)", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 24 }}>
          <Text className="text-3xl font-bold text-primary-foreground">
            {((profile?.full_name as string)?.charAt(0)) || "S"}
          </Text>
        </View>
        {isLoading ? (
          <ActivityIndicator />
        ) : (
          <>
            <Text className="text-xl font-bold text-foreground">{profile?.full_name as string}</Text>
            <View className="flex-row items-center mt-1">
              <Mail size={14} color="#6C5560" />
              <Text className="text-muted-foreground text-sm ml-1">{profile?.matric_number as string}</Text>
            </View>
            {profile?.programmes?.name && (
              <View className="flex-row items-center mt-0.5">
                <BookOpen size={14} color="#6C5560" />
                <Text className="text-muted-foreground text-sm ml-1">
                  {profile.programmes.name} · Level {profile.current_level}
                </Text>
              </View>
            )}
          </>
        )}
      </View>

      <View className="px-5 gap-3 pb-8">
        {(!profile?.matric_number || !(profile.matric_number as string).trim()) && !isLoading && (
          <View
            style={{ backgroundColor: "#FBE8D0", borderColor: "#D4750A", borderWidth: 1 }}
            className="rounded-2xl px-4 py-3 flex-row items-start gap-3"
          >
            <AlertCircle size={18} color="#D4750A" style={{ marginTop: 1 }} />
            <View className="flex-1">
              <Text className="text-sm font-semibold" style={{ color: "#7A1030" }}>Update your details</Text>
              <Text className="text-xs mt-0.5" style={{ color: "#7A1030" }}>
                You registered without a matric number. Update your matric number and
                school email when you receive them.
              </Text>
            </View>
          </View>
        )}

        {canChangeLevel && (
          <View
            style={{ backgroundColor: "#FFFDFB", borderColor: "#E5D7D0", borderWidth: 1 }}
            className="rounded-2xl p-4"
          >
            <Text className="text-sm font-semibold text-foreground mb-2">Change Level</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {availableLevels.map((lvl) => {
                  const active = (selectedLevel ?? (profile?.current_level as number)) === lvl;
                  return (
                    <TouchableOpacity
                      key={lvl}
                      className={`px-5 py-2.5 rounded-full ${active ? "bg-primary" : "bg-muted"}`}
                      onPress={() => setSelectedLevel(lvl)}
                    >
                      <Text className={active ? "text-primary-foreground font-medium text-sm" : "text-foreground text-sm"}>
                        Level {lvl}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            {selectedLevel != null && selectedLevel !== (profile?.current_level as number) && (
              <TouchableOpacity
                className="mt-3 bg-primary py-3 rounded-xl items-center"
                onPress={handleSaveLevel}
                disabled={savingLevel}
              >
                {savingLevel ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-primary-foreground font-semibold text-sm">Save Level</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
        <View
          style={{ backgroundColor: "#FFFDFB", borderColor: "#E5D7D0", borderWidth: 1 }}
          className="rounded-2xl p-4"
        >
          <View className="flex-row items-center mb-3">
            <Phone size={18} color="#7A1030" />
            <Text className="text-foreground font-semibold ml-2">Contact details</Text>
          </View>
          <Text className="text-xs text-muted-foreground mb-3">
            Only shared in study groups if you choose to share them. You are always identified by matric number.
          </Text>
          <View className="gap-3">
            <View>
              <Text className="text-sm font-semibold text-foreground mb-1.5">Phone number</Text>
              <TextInput
                className="h-12 rounded-xl border border-input bg-white px-4 text-foreground"
                placeholder="0803 000 0000"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>
            <View>
              <Text className="text-sm font-semibold text-foreground mb-1.5">Account number</Text>
              <TextInput
                className="h-12 rounded-xl border border-input bg-white px-4 text-foreground"
                placeholder="0123456789"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                value={accountNumber}
                onChangeText={setAccountNumber}
              />
            </View>
            <TouchableOpacity
              className="bg-primary py-3 rounded-xl items-center mt-1"
              onPress={handleSaveContact}
              disabled={savingContact}
            >
              {savingContact ? <ActivityIndicator color="white" /> : <Text className="text-primary-foreground font-semibold text-sm">Save contact details</Text>}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          className="bg-white/90 p-4 rounded-2xl flex-row items-center"
          onPress={() => router.push("/(tabs)/my-work")}
        >
          <Clock size={22} color="#7A1030" />
          <Text className="flex-1 text-foreground font-medium ml-3">My Contributions</Text>
          <ChevronRight size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-white/90 p-4 rounded-2xl flex-row items-center"
          onPress={() => router.push("/feedback")}
        >
          <MessageSquare size={22} color="#D4750A" />
          <Text className="flex-1 text-foreground font-medium ml-3">Send Feedback</Text>
          <ChevronRight size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <View className="h-px bg-border my-1" />

        <TouchableOpacity
          className="bg-white/90 p-4 rounded-2xl flex-row items-center"
          onPress={() => signOut().then(() => router.replace("/(auth)/login"))}
        >
          <LogOut size={22} color="#DC2626" />
          <Text className="flex-1 text-destructive font-medium ml-3">Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
