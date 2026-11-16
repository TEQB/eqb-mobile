import { getApiBaseUrl } from "./env";

const BASE_URL = getApiBaseUrl();

interface ApiOptions extends RequestInit {
  params?: Record<string, string | undefined>;
}

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;
  let url = `${BASE_URL}${path}`;
  if (params) {
    const qs = Object.entries(params)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v!)}`)
      .join("&");
    if (qs) url += `?${qs}`;
  }

  const res = await fetch(url, {
    ...fetchOptions,
    headers: { "Content-Type": "application/json", ...fetchOptions.headers },
  });
  if (!res.ok) {
    const text = await res.text();
    let msg = text.slice(0, 200);
    try {
      const json = JSON.parse(text);
      if (json?.error) msg = json.error;
    } catch {
      // not JSON, use raw text
    }
    throw new Error(msg || `Request failed (${res.status})`);
  }
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return {} as T;
}

export const api = {
  get: <T>(path: string, params?: Record<string, string | undefined>) =>
    request<T>(path, { params }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
};
