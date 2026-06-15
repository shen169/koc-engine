/** KOC Engine API client */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

interface ApiOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

export async function api(path: string, opts: ApiOptions = {}) {
  const { method = "GET", body, token } = opts;
  const headers: Record<string, string> = {};

  if (body) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || `API error: ${res.status}`);
  }
  return data;
}

// Auth helpers
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("koc_token");
}

export function setToken(token: string) {
  localStorage.setItem("koc_token", token);
}

export function clearToken() {
  localStorage.removeItem("koc_token");
}

export function getRole(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("koc_role");
}

// Auth API
export const auth = {
  register: (email: string, password: string, role: string) =>
    api("/api/auth/register", { method: "POST", body: { email, password, role } }),
  login: (email: string, password: string) =>
    api("/api/auth/login", { method: "POST", body: { email, password } }),
  me: (token: string) => api("/api/auth/me", { token }),
};

// Applications
export const applications = {
  submit: (data: Record<string, unknown>) =>
    api("/api/applications", { method: "POST", body: data }),
  list: (token: string) => api("/api/applications", { token }),
  decide: (appId: string, decision: string, token: string) =>
    api(`/api/applications/${appId}/decision`, { method: "PUT", body: { decision }, token }),
};

// KOC
export const kocs = {
  list: (token: string, filters?: Record<string, string>) => {
    const qs = filters ? "?" + new URLSearchParams(filters).toString() : "";
    return api(`/api/koc${qs}`, { token });
  },
  pool: (token: string) => api("/api/koc/pool", { token }),
  get: (id: string, token: string) => api(`/api/koc/${id}`, { token }),
};

// Products
export const products = {
  create: (data: Record<string, unknown>, token: string) =>
    api("/api/products", { method: "POST", body: data, token }),
  list: (token: string) => api("/api/products", { token }),
  get: (id: string, token: string) => api(`/api/products/${id}`, { token }),
};

// Interests
export const interests = {
  express: (toId: string, toType: string, token: string) =>
    api("/api/interests", { method: "POST", body: { to_id: toId, to_type: toType }, token }),
  list: (token: string) => api("/api/interests", { token }),
  matches: (token: string) => api("/api/interests/matches", { token }),
  match: (id: string, token: string) =>
    api(`/api/interests/${id}/match`, { method: "PUT", token }),
};

// Tasks
export const tasks = {
  create: (data: Record<string, unknown>, token: string) =>
    api("/api/tasks", { method: "POST", body: data, token }),
  list: (token: string) => api("/api/tasks", { token }),
  get: (id: string, token: string) => api(`/api/tasks/${id}`, { token }),
  submit: (id: string, submitUrl: string, token: string) =>
    api(`/api/tasks/${id}/submit`, { method: "PUT", body: { submit_url: submitUrl }, token }),
  confirm: (id: string, token: string) =>
    api(`/api/tasks/${id}/confirm`, { method: "PUT", token }),
};

// Credits
export const credits = {
  balance: (token: string) => api("/api/credits/balance", { token }),
  history: (token: string) => api("/api/credits/history", { token }),
};

// Admin
export const admin = {
  stats: (token: string) => api("/api/admin/stats", { token }),
};

// Landing
export const landing = {
  stats: () => api("/api/landing/stats"),
  products: () => api("/api/landing/products"),
};
