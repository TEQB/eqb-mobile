import { useState, useEffect, useCallback, useMemo } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, Alert, Modal, ScrollView, Switch, Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { studyGroupsApi, type GroupMember } from "@/lib/studyGroups";
import { getSupabaseClient } from "@/lib/supabase/client";
import QRCode from "react-native-qrcode-svg";
import * as ImagePicker from "expo-image-picker";
import {
  ChevronLeft, Send, QrCode, LogOut, Shield, X, UserX, Image as ImageIcon,
} from "lucide-react-native";

interface Message {
  id: string;
  group_id: string;
  sender_id: string;
  content: string | null;
  type: string;
  media_url: string | null;
  reply_to_id: string | null;
  created_at: string;
}

const MESSAGE_SELECT = "id, group_id, sender_id, content, type, media_url, reply_to_id, created_at";

function uniqueMediaPath(groupId: string, ext: string) {
  return `${groupId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

function ChatImage({ path, onPress }: { path: string; onPress?: () => void }) {
  const supabase = getSupabaseClient();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.storage.from("chat-media").createSignedUrl(path, 3600);
      if (!cancelled && data?.signedUrl) setUrl(data.signedUrl);
    })();
    return () => { cancelled = true; };
  }, [path, supabase]);

  if (!url) {
    return (
      <View className="w-56 h-40 bg-muted rounded-xl items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <Image source={{ uri: url }} className="w-56 h-56 rounded-xl" resizeMode="cover" />
    </TouchableOpacity>
  );
}

export default function GroupChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  const [tab, setTab] = useState<"chat" | "members">("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  const { data: detail, isLoading, refetch } = useQuery({
    queryKey: ["study-group", id],
    queryFn: () => studyGroupsApi.detail(id!),
    enabled: !!id,
  });

  const group = detail?.group;
  const members = useMemo(() => detail?.members ?? [], [detail?.members]);

  const myMembership = members.find((m) => m.is_me);
  const myProfileId = myMembership?.profile_id ?? null;
  const isAdmin = myMembership?.role === "admin";

  const memberMap = useMemo(() => new Map<string, GroupMember>(members.map((m) => [m.profile_id, m])), [members]);
  const messageMap = useMemo(() => new Map<string, Message>(messages.map((m) => [m.id, m])), [messages]);

  const senderLabel = useCallback((senderId: string) => {
    const m = memberMap.get(senderId);
    if (!m) return "Unknown";
    const name = m.full_name ? `${m.full_name} · ` : "";
    return `${name}${m.matric_number ?? "Student"}`;
  }, [memberMap]);

  const messagePreview = useCallback((msg: Message) => {
    if (msg.type === "image") return "📷 Photo";
    return msg.content ?? "";
  }, []);

  // Fetch initial messages
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoadingMessages(true);
      const { data } = await supabase
        .from("study_group_messages")
        .select(MESSAGE_SELECT)
        .eq("group_id", id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (!cancelled && data) setMessages(data as Message[]);
      setLoadingMessages(false);
    })();
    return () => { cancelled = true; };
  }, [id, supabase]);

  // Realtime subscription
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`group-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "study_group_messages", filter: `group_id=eq.${id}` },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [msg, ...prev];
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, supabase]);

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || !myProfileId || sending) return;
    setSending(true);
    setInput("");
    const replyId = replyTo?.id ?? null;
    setReplyTo(null);
    try {
      await studyGroupsApi.sendMessage(id!, { content, type: "text", reply_to_id: replyId });
    } catch (err: any) {
      Alert.alert("Failed to send", err.message || "Please try again");
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  const pickAndSendImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    if (!asset.uri) return;

    setUploading(true);
    try {
      const ext = (asset.uri.split(".").pop() || "jpg").toLowerCase();
      const path = uniqueMediaPath(id!, ext);

      const formData = new FormData();
      formData.append("file", {
        uri: asset.uri,
        name: `photo.${ext}`,
        type: asset.mimeType || "image/jpeg",
      } as any);

      const { error: uploadError } = await supabase.storage.from("chat-media").upload(path, formData, {
        contentType: asset.mimeType || "image/jpeg",
        upsert: false,
      });
      if (uploadError) throw uploadError;

      await studyGroupsApi.sendMessage(id!, { type: "image", media_url: path, reply_to_id: replyTo?.id ?? null });
      setReplyTo(null);
    } catch (err: any) {
      Alert.alert("Failed to send image", err.message || "Please try again");
    } finally {
      setUploading(false);
    }
  };

  const openImageViewer = async (path: string) => {
    const { data } = await supabase.storage.from("chat-media").createSignedUrl(path, 3600);
    if (data?.signedUrl) setViewerUrl(data.signedUrl);
  };

  const handleLeave = () => {
    Alert.alert("Leave group?", "You will stop receiving messages from this group.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            await studyGroupsApi.leave(id!);
            queryClient.invalidateQueries({ queryKey: ["study-groups-mine"] });
            router.back();
          } catch (err: any) {
            Alert.alert("Error", err.message || "Could not leave group");
          }
        },
      },
    ]);
  };

  const handleRemoveMember = (memberProfileId: string, label: string) => {
    Alert.alert("Remove member?", `Remove ${label} from the group?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await studyGroupsApi.removeMember(id!, memberProfileId);
            refetch();
          } catch (err: any) {
            Alert.alert("Error", err.message || "Could not remove member");
          }
        },
      },
    ]);
  };

  const updatePrivacy = async (key: "share_name" | "share_phone" | "share_account_number", value: boolean) => {
    if (!myMembership) return;
    const next = {
      share_name: myMembership.share_name,
      share_phone: myMembership.share_phone,
      share_account_number: myMembership.share_account_number,
      [key]: value,
    };
    try {
      await studyGroupsApi.updatePrivacy(id!, next);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["study-group", id] });
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not update privacy settings");
    }
  };

  const renderReplyQuote = (msg: Message) => {
    const replied = msg.reply_to_id ? messageMap.get(msg.reply_to_id) : null;
    if (!replied) {
      return (
        <View className="bg-black/10 rounded-lg px-2 py-1 mb-1">
          <Text className="text-[11px] italic text-gray-600">Original message</Text>
        </View>
      );
    }
    const mine = replied.sender_id === myProfileId;
    return (
      <View className={`rounded-lg px-2 py-1 mb-1 ${mine ? "bg-white/20" : "bg-black/10"}`}>
        <Text className={`text-[11px] font-semibold ${mine ? "text-white" : "text-primary"}`}>
          {senderLabel(replied.sender_id)}
        </Text>
        <Text className={`text-[11px] ${mine ? "text-white/80" : "text-gray-600"}`} numberOfLines={1}>
          {messagePreview(replied)}
        </Text>
      </View>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const mine = item.sender_id === myProfileId;
    return (
      <TouchableOpacity
        className={`mb-2 ${mine ? "items-end" : "items-start"}`}
        onLongPress={() => setReplyTo(item)}
        delayLongPress={250}
        activeOpacity={0.8}
      >
        {!mine && (
          <Text className="text-xs text-muted-foreground mb-0.5 ml-1">{senderLabel(item.sender_id)}</Text>
        )}
        <View
          className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
            mine ? "bg-primary rounded-br-sm" : "bg-white rounded-bl-sm"
          }`}
        >
          {item.reply_to_id && renderReplyQuote(item)}
          {item.type === "image" && item.media_url ? (
            <ChatImage path={item.media_url} onPress={() => openImageViewer(item.media_url!)} />
          ) : (
            <Text className={mine ? "text-primary-foreground" : "text-foreground"}>{item.content}</Text>
          )}
          {item.type === "image" && item.content ? (
            <Text className={`text-xs mt-1 ${mine ? "text-white/80" : "text-gray-500"}`}>{item.content}</Text>
          ) : null}
        </View>
        <Text className="text-[10px] text-muted-foreground mt-0.5">
          {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          {mine ? " · You" : ""}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Header */}
      <View className="bg-white px-4 pt-12 pb-3 border-b border-border">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <ChevronLeft size={24} color="#111827" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-lg font-bold text-foreground" numberOfLines={1}>{group?.name ?? "Group"}</Text>
            {group?.course && (
              <Text className="text-xs text-muted-foreground">
                {group.course.code} · {group.course.title}
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={() => setQrOpen(true)} className="p-2">
            <QrCode size={22} color="#7A1030" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View className="flex-row mt-3 bg-muted rounded-lg p-1">
          {(["chat", "members"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              className={`flex-1 py-2 rounded-md items-center ${tab === t ? "bg-white" : ""}`}
              onPress={() => setTab(t)}
            >
              <Text className={`text-sm font-semibold ${tab === t ? "text-foreground" : "text-muted-foreground"}`}>
                {t === "chat" ? "Chat" : `Members (${members.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" className="mt-10" />
      ) : tab === "chat" ? (
        <>
          <FlatList
            className="flex-1 px-4 pt-3"
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={{ paddingBottom: 12 }}
            ListEmptyComponent={
              loadingMessages ? (
                <ActivityIndicator className="mt-10" />
              ) : (
                <Text className="text-center text-muted-foreground mt-10">
                  No messages yet. Start the conversation!
                </Text>
              )
            }
          />

          {/* Reply preview */}
          {replyTo && (
            <View className="flex-row items-center gap-2 px-4 py-2 bg-white border-t border-border">
              <View className="flex-1 bg-muted rounded-lg px-3 py-2 border-l-4 border-primary">
                <Text className="text-xs font-semibold text-primary">Replying to {senderLabel(replyTo.sender_id)}</Text>
                <Text className="text-xs text-gray-600" numberOfLines={1}>{messagePreview(replyTo)}</Text>
              </View>
              <TouchableOpacity onPress={() => setReplyTo(null)} className="p-1">
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>
          )}

          {/* Input */}
          <View className="flex-row items-center gap-2 px-4 py-3 bg-white border-t border-border">
            <TouchableOpacity
              className="w-11 h-11 bg-muted rounded-full items-center justify-center"
              onPress={pickAndSendImage}
              disabled={uploading || !myProfileId}
            >
              {uploading ? <ActivityIndicator size="small" /> : <ImageIcon size={20} color="#7A1030" />}
            </TouchableOpacity>
            <TextInput
              className="flex-1 bg-muted rounded-full px-4 py-2.5 text-foreground"
              placeholder="Type a message..."
              placeholderTextColor="#9CA3AF"
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              className="w-11 h-11 bg-primary rounded-full items-center justify-center"
              onPress={sendMessage}
              disabled={sending || !input.trim()}
            >
              <Send size={18} color="white" />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <ScrollView className="flex-1 px-4 pt-3 pb-6">
          {/* Privacy settings */}
          <View className="bg-white/90 rounded-2xl p-4 mb-4 shadow-sm">
            <View className="flex-row items-center mb-3">
              <Shield size={18} color="#7A1030" />
              <Text className="text-foreground font-semibold ml-2">Your privacy in this group</Text>
            </View>
            <Text className="text-xs text-muted-foreground mb-3">
              You are always identified by your matric number. Choose what else to share:
            </Text>
            {([
              ["share_name", "Share my name"],
              ["share_phone", "Share my phone number"],
              ["share_account_number", "Share my account number"],
            ] as const).map(([key, label]) => (
              <View key={key} className="flex-row items-center justify-between py-2">
                <Text className="text-foreground text-sm">{label}</Text>
                <Switch
                  value={myMembership?.[key] ?? false}
                  onValueChange={(v) => updatePrivacy(key, v)}
                  trackColor={{ true: "#7A1030", false: "#E5D7D0" }}
                />
              </View>
            ))}
          </View>

          {/* Members list */}
          {members.map((m) => (
            <View key={m.membership_id} className="bg-white/90 rounded-2xl p-4 mb-3 flex-row items-center">
              <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center">
                <Text className="text-primary font-bold">{(m.matric_number ?? "S").charAt(0)}</Text>
              </View>
              <View className="flex-1 ml-3">
                <View className="flex-row items-center gap-2">
                  <Text className="text-foreground font-semibold">{m.matric_number ?? "Student"}</Text>
                  {m.role === "admin" && (
                    <View className="bg-primary/10 rounded-full px-2 py-0.5">
                      <Text className="text-primary text-[10px] font-semibold">Admin</Text>
                    </View>
                  )}
                  {m.is_me && (
                    <View className="bg-secondary/10 rounded-full px-2 py-0.5">
                      <Text className="text-secondary text-[10px] font-semibold">You</Text>
                    </View>
                  )}
                </View>
                {m.full_name && <Text className="text-muted-foreground text-sm">{m.full_name}</Text>}
                <Text className="text-muted-foreground text-xs mt-0.5">
                  {m.programme_name ?? ""}{m.current_level ? ` · Level ${m.current_level}` : ""}
                </Text>
                {m.phone_number && <Text className="text-xs text-muted-foreground mt-0.5">📞 {m.phone_number}</Text>}
                {m.bank_account_number && <Text className="text-xs text-muted-foreground">🏦 {m.bank_account_number}</Text>}
              </View>
              {isAdmin && !m.is_me && (
                <TouchableOpacity onPress={() => handleRemoveMember(m.profile_id, m.matric_number ?? "this member")} className="p-2">
                  <UserX size={18} color="#DC2626" />
                </TouchableOpacity>
              )}
            </View>
          ))}

          <TouchableOpacity
            className="bg-white/90 rounded-2xl p-4 mt-2 flex-row items-center justify-center gap-2"
            onPress={handleLeave}
          >
            <LogOut size={18} color="#DC2626" />
            <Text className="text-destructive font-semibold">Leave group</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* QR Invite modal */}
      <Modal visible={qrOpen} animationType="fade" onRequestClose={() => setQrOpen(false)}>
        <View className="flex-1 bg-background/95 items-center justify-center p-6">
          <View className="bg-white rounded-3xl p-6 items-center w-full max-w-sm">
            <View className="flex-row items-center justify-between w-full mb-4">
              <Text className="text-lg font-bold text-foreground">Invite to group</Text>
              <TouchableOpacity onPress={() => setQrOpen(false)}>
                <X size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text className="text-sm text-muted-foreground text-center mb-4">
              {group?.name} — ask classmates to scan this code or enter the invite code.
            </Text>
            <View className="bg-white p-4 rounded-2xl border border-border">
              <QRCode value={group?.invite_code ?? ""} size={200} />
            </View>
            <View className="mt-4 bg-muted rounded-xl px-4 py-3 w-full items-center">
              <Text className="text-xs text-muted-foreground">Invite code</Text>
              <Text className="text-xl font-bold tracking-widest text-foreground">{group?.invite_code}</Text>
            </View>
            <Text className="text-xs text-muted-foreground text-center mt-3">
              Only students enrolled in {group?.course?.code} can join.
            </Text>
          </View>
        </View>
      </Modal>

      {/* Image viewer modal */}
      <Modal visible={!!viewerUrl} animationType="fade" onRequestClose={() => setViewerUrl(null)}>
        <View className="flex-1 bg-black/95 items-center justify-center">
          <TouchableOpacity className="absolute top-12 right-4 z-10" onPress={() => setViewerUrl(null)}>
            <X size={28} color="white" />
          </TouchableOpacity>
          {viewerUrl && <Image source={{ uri: viewerUrl }} className="w-full h-full" resizeMode="contain" />}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
