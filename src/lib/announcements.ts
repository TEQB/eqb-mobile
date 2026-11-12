import { getApiBaseUrl } from "./env";
import { getSupabaseClient } from "./supabase/client";

const BASE_URL = getApiBaseUrl();

export interface Announcement {
  id: string;
  title: string;
  body: string;
  display_type: "modal" | "banner";
  duration_type: string;
  duration_value: number;
  created_at: string;
}

async function authedFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${BASE_URL}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as { error?: string })?.error || `Request failed (${res.status})`);
  }
  return body as T;
}

export const announcementsApi = {
  list: () => authedFetch<{ announcements: Announcement[] }>(`/announcements`),

  mark: (announcementId: string, action: "shown" | "dismiss") =>
    authedFetch<{ success: boolean }>(`/announcements`, {
      method: "POST",
      body: JSON.stringify({ announcement_id: announcementId, action }),
    }),
};
