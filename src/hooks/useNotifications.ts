import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { getSupabaseClient } from "@/lib/supabase/client";
import { uniqueChannelTopic } from "@/lib/utils";

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  metadata: any;
  is_read: boolean;
  created_at: string | null;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const { user } = useAuth();
  const supabase = getSupabaseClient();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Resolve profile ID
  useEffect(() => {
    if (!user) {
      setProfileId(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id")
          .eq("auth_user_id", user.id)
          .single();
        if (cancelled) return;
        if (error || !data) {
          setProfileId(null);
          setLoading(false);
        } else {
          setProfileId((data as any).id);
        }
      } catch {
        if (!cancelled) {
          setProfileId(null);
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    if (!profileId) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", profileId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setNotifications(data as unknown as Notification[]);
    setLoading(false);
  }, [profileId]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);

    // Realtime subscription for instant updates
    if (profileId) {
      const channel = supabase
        .channel(uniqueChannelTopic(`notifications-${profileId}`))
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${profileId}`,
          },
          () => fetchNotifications(),
        )
        .subscribe();

      return () => {
        clearInterval(interval);
        supabase.removeChannel(channel);
      };
    }

    return () => clearInterval(interval);
  }, [fetchNotifications, profileId]);

  const markRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);
  };

  const markAllRead = async () => {
    if (!profileId) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", profileId)
      .eq("is_read", false);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return { notifications, unreadCount, loading, markRead, markAllRead, refresh: fetchNotifications };
}
