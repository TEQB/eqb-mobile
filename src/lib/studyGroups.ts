import { getApiBaseUrl } from "./env";
import { getSupabaseClient } from "./supabase/client";

const BASE_URL = getApiBaseUrl();

export interface StudyGroup {
  id: string;
  course_id: string;
  name: string;
  description: string | null;
  invite_code: string;
  created_by: string;
  is_active: boolean;
  created_at: string;
  member_count?: number;
  is_member?: boolean;
  my_role?: string;
  my_privacy?: {
    share_name: boolean;
    share_phone: boolean;
    share_account_number: boolean;
  };
  course?: { id: string; code: string; title: string; level: number };
}

export interface GroupMember {
  membership_id: string;
  profile_id: string;
  role: string;
  joined_at: string;
  is_me: boolean;
  matric_number: string | null;
  full_name: string | null;
  phone_number: string | null;
  bank_account_number: string | null;
  programme_name: string | null;
  current_level: number | null;
  share_name: boolean;
  share_phone: boolean;
  share_account_number: boolean;
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
    throw new Error((body as any)?.error || `Request failed (${res.status})`);
  }
  return body as T;
}

export const studyGroupsApi = {
  listForCourse: (courseId: string) =>
    authedFetch<{ groups: StudyGroup[] }>(`/study-groups?course_id=${courseId}`),

  listMine: () =>
    authedFetch<{ groups: StudyGroup[] }>(`/study-groups?mine=true`),

  create: (input: { course_id: string; name: string; description?: string }) =>
    authedFetch<{ group: StudyGroup }>(`/study-groups`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  join: (inviteCode: string) =>
    authedFetch<{ success: boolean; group_id: string; group_name: string }>(`/study-groups/join`, {
      method: "POST",
      body: JSON.stringify({ invite_code: inviteCode }),
    }),

  detail: (groupId: string) =>
    authedFetch<{ group: StudyGroup; members: GroupMember[] }>(`/study-groups/${groupId}`),

  updatePrivacy: (groupId: string, privacy: { share_name: boolean; share_phone: boolean; share_account_number: boolean }) =>
    authedFetch<{ success: boolean }>(`/study-groups/${groupId}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "update-privacy", ...privacy }),
    }),

  leave: (groupId: string) =>
    authedFetch<{ success: boolean }>(`/study-groups/${groupId}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "leave" }),
    }),

  removeMember: (groupId: string, memberProfileId: string) =>
    authedFetch<{ success: boolean }>(`/study-groups/${groupId}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "remove-member", member_id: memberProfileId }),
    }),

  sendMessage: (groupId: string, payload: {
    content?: string;
    type: "text" | "image" | "voice";
    media_url?: string | null;
    reply_to_id?: string | null;
  }) =>
    authedFetch<{ success: boolean }>(`/study-groups/${groupId}/messages`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
