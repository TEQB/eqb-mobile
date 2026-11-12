import { useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator, TextInput,
  Modal, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { studyGroupsApi } from "@/lib/studyGroups";
import { CameraView, useCameraPermissions } from "expo-camera";
import { MessageCircle, QrCode, Users, ChevronRight, Search, X } from "lucide-react-native";

export default function GroupsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const { data, isLoading } = useQuery({
    queryKey: ["study-groups-mine"],
    queryFn: () => studyGroupsApi.listMine(),
  });

  const groups = data?.groups ?? [];

  const handleJoin = async (code: string) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      Alert.alert("Enter a code", "Please enter the group invite code.");
      return;
    }
    setJoining(true);
    try {
      const res = await studyGroupsApi.join(trimmed);
      Alert.alert("Joined!", `You joined ${res.group_name}.`);
      setJoinCode("");
      setScannerOpen(false);
      queryClient.invalidateQueries({ queryKey: ["study-groups-mine"] });
      router.push(`/group/${res.group_id}`);
    } catch (err: any) {
      Alert.alert("Could not join", err.message || "Invalid or expired code.");
    } finally {
      setJoining(false);
    }
  };

  const handleScan = ({ data }: { data: string }) => {
    // QR encodes the invite code directly
    const code = data.trim().toUpperCase();
    if (code.length >= 4) {
      handleJoin(code);
    }
  };

  const openScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert("Camera permission needed", "Enable camera access to scan QR codes.");
        return;
      }
    }
    setScannerOpen(true);
  };

  return (
    <View className="flex-1 bg-background">
      <View className="px-5 pt-5 pb-3">
        <Text className="text-foreground text-2xl font-bold">Study Groups</Text>
        <Text className="text-muted-foreground text-sm mt-1">
          Chat with classmates about your courses in real time.
        </Text>
      </View>

      {/* Join section */}
      <View className="px-5 pb-4 gap-3">
        <View className="bg-white/90 rounded-2xl p-4 shadow-sm" style={{ shadowColor: "rgba(63,39,50,0.06)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12 }}>
          <Text className="text-sm font-semibold text-foreground mb-2">Join a group</Text>
          <View className="flex-row gap-2">
            <View className="flex-1 flex-row items-center bg-muted rounded-xl px-3 h-11">
              <Search size={16} color="#9CA3AF" />
              <TextInput
                className="flex-1 ml-2 text-foreground"
                placeholder="Invite code"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
                value={joinCode}
                onChangeText={(t) => setJoinCode(t.toUpperCase())}
              />
            </View>
            <TouchableOpacity
              className="bg-primary px-4 rounded-xl items-center justify-center h-11"
              onPress={() => handleJoin(joinCode)}
              disabled={joining}
            >
              {joining ? <ActivityIndicator color="white" /> : <Text className="text-primary-foreground font-semibold">Join</Text>}
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            className="mt-3 flex-row items-center justify-center gap-2 bg-secondary/10 rounded-xl py-2.5"
            onPress={openScanner}
          >
            <QrCode size={18} color="#D4750A" />
            <Text className="text-secondary font-semibold text-sm">Scan QR code</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* My groups */}
      <Text className="px-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">My Groups</Text>
      {isLoading ? (
        <ActivityIndicator size="large" className="mt-6" />
      ) : (
        <FlatList
          className="px-5"
          data={groups}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <View className="items-center mt-10">
              <Users size={40} color="#D1D5DB" />
              <Text className="text-muted-foreground mt-2 text-center">
                You are not in any study groups yet.{"\n"}Create one from a course page or join with a code.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              className="bg-white/90 rounded-2xl p-4 mb-3 flex-row items-center shadow-sm"
              style={{ shadowColor: "rgba(63,39,50,0.06)", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12 }}
              onPress={() => router.push(`/group/${item.id}`)}
            >
              <View className="w-11 h-11 bg-primary/10 rounded-xl items-center justify-center">
                <MessageCircle size={20} color="#7A1030" />
              </View>
              <View className="flex-1 ml-3">
                <Text className="text-foreground font-semibold" numberOfLines={1}>{item.name}</Text>
                {item.course && (
                  <Text className="text-muted-foreground text-xs mt-0.5">
                    {item.course.code} · Level {item.course.level}
                  </Text>
                )}
                <Text className="text-muted-foreground text-xs mt-0.5">
                  {item.member_count ?? "?"} members · You are {item.my_role === "admin" ? "admin" : "a member"}
                </Text>
              </View>
              <ChevronRight size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        />
      )}

      {/* QR Scanner modal */}
      <Modal visible={scannerOpen} animationType="slide" onRequestClose={() => setScannerOpen(false)}>
        <KeyboardAvoidingView className="flex-1 bg-black" behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View className="flex-row items-center justify-between px-4 pt-12 pb-3">
            <Text className="text-white text-lg font-semibold">Scan QR code</Text>
            <TouchableOpacity onPress={() => setScannerOpen(false)}>
              <X size={24} color="white" />
            </TouchableOpacity>
          </View>
          <View className="flex-1">
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={handleScan}
            />
            <View className="absolute inset-0 items-center justify-center pointer-events-none">
              <View className="w-64 h-64 border-2 border-white/80 rounded-2xl" />
            </View>
          </View>
          <View className="p-4">
            <Text className="text-white/70 text-center text-sm">
              Point your camera at a study group QR code to join.
            </Text>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
