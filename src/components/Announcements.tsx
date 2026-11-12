import { useEffect, useState, useCallback } from "react";
import { View, Text, Modal, TouchableOpacity, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Megaphone, X } from "lucide-react-native";
import { useAuth } from "@/providers/AuthProvider";
import { getSupabaseClient } from "@/lib/supabase/client";
import { announcementsApi, type Announcement } from "@/lib/announcements";

export function Announcements() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Announcement[]>([]);
  const [modalQueue, setModalQueue] = useState<Announcement[]>([]);
  const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(new Set());

  const mark = useCallback(async (id: string, action: "shown" | "dismiss") => {
    try {
      await announcementsApi.mark(id, action);
    } catch {
      // non-fatal
    }
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    if (!user) return;
    try {
      const { announcements } = await announcementsApi.list();
      setItems(announcements);
      const modals = announcements.filter((a) => a.display_type === "modal");
      if (modals.length > 0) {
        setModalQueue(modals);
        modals.forEach((m) => mark(m.id, "shown"));
      }
    } catch {
      // non-fatal (e.g. API not deployed yet)
    }
  }, [user, mark]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      await fetchAnnouncements();
    })();
    return () => {
      cancelled = true;
    };
  }, [user, fetchAnnouncements]);

  // Realtime: listen for new announcements
  useEffect(() => {
    if (!user) return;
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel("announcements")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "announcements" },
        () => {
          fetchAnnouncements();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchAnnouncements]);

  const closeModal = (a: Announcement) => {
    setModalQueue((q) => q.filter((m) => m.id !== a.id));
    mark(a.id, "dismiss");
  };

  const dismissBanner = (id: string) => {
    setDismissedBanners((s) => new Set(s).add(id));
    mark(id, "dismiss");
  };

  const banners = items.filter(
    (a) => a.display_type === "banner" && !dismissedBanners.has(a.id),
  );
  const currentModal = modalQueue[0] ?? null;

  return (
    <>
      {banners.length > 0 && (
        <View
          className="absolute left-4 right-4 z-40 gap-2"
          style={{ top: insets.top + 60 }}
          pointerEvents="box-none"
        >
          {banners.map((a) => (
            <View
              key={a.id}
              className="flex-row items-start gap-3 rounded-xl border border-primary/30 bg-white/95 px-4 py-3 shadow-md"
            >
              <Megaphone size={18} color="#7A1030" style={{ marginTop: 2 }} />
              <View className="flex-1">
                <Text className="text-sm font-bold text-foreground">{a.title}</Text>
                <Text className="mt-0.5 text-sm text-gray-600">{a.body}</Text>
              </View>
              <TouchableOpacity onPress={() => dismissBanner(a.id)} className="p-1">
                <X size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <Modal
        visible={!!currentModal}
        transparent
        animationType="fade"
        onRequestClose={() => currentModal && closeModal(currentModal)}
      >
        <View className="flex-1 items-center justify-center bg-black/50 p-6">
          <View className="w-full max-w-md rounded-2xl bg-white p-6">
            <View className="flex-row items-start gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Megaphone size={20} color="#7A1030" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-foreground">{currentModal?.title}</Text>
                <ScrollView className="mt-2 max-h-64">
                  <Text className="text-sm text-gray-600">{currentModal?.body}</Text>
                </ScrollView>
              </View>
              <TouchableOpacity onPress={() => currentModal && closeModal(currentModal)} className="p-1">
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => currentModal && closeModal(currentModal)}
              className="mt-5 items-center rounded-xl bg-primary py-3"
            >
              <Text className="text-sm font-semibold text-white">Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
