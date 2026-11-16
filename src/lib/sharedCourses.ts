import { getApiBaseUrl } from "@/lib/env";
import { getSupabaseClient } from "@/lib/supabase/client";

const API_BASE = getApiBaseUrl();

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = getSupabaseClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface StudentCourse {
  id: string;
  code: string;
  title: string;
  level: number;
  scope: "departmental" | "shared" | "general";
  programme_id?: string;
}

export interface PendingSharedRequest {
  id: string;
  course_id: string;
  programme_id: string;
  requester_id: string;
  action_type: "join" | "leave";
  created_at: string;
  course: { code: string; title: string; level: number };
  requester: { full_name: string };
  voteCounts: { approve: number; reject: number };
  userVoted: boolean;
  userVote: string | null;
}

export const sharedCoursesApi = {
  async getJoinable(programmeId: string): Promise<StudentCourse[]> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/browse/joinable?programme_id=${programmeId}`, { headers });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    return data.courses || [];
  },

  async getLinkedSharedIds(programmeId: string): Promise<Set<string>> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/browse/linked?programme_id=${programmeId}`, { headers });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    return new Set(data.courseIds || []);
  },

  async getPendingRequests(programmeId: string, profileId: string): Promise<PendingSharedRequest[]> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/browse/pending?programme_id=${programmeId}&profile_id=${profileId}`, { headers });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    return data.requests || [];
  },

  async joinShared(courseId: string): Promise<{ message: string }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/courses/${courseId}/join-shared`, {
      method: "POST",
      headers,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to join");
    return data;
  },

  async leaveShared(courseId: string): Promise<{ message: string }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/courses/${courseId}/join-shared`, {
      method: "DELETE",
      headers,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to leave");
    return data;
  },

  async vote(requestId: string, vote: "approve" | "reject"): Promise<{ success: boolean; message?: string }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api/courses/shared-vote`, {
      method: "POST",
      headers,
      body: JSON.stringify({ requestId, vote }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to vote");
    return data;
  },
};
