import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
const TOKEN_KEY = "rono_auth_token";

export async function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_URL}${path}`, { ...options, headers });
    if (!res.ok && res.status >= 500) {
      return { success: false, error: `Server error (${res.status})` };
    }
    return res.json();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

export const api = {
  // ─── Auth ──────────────────────────────────────────────────────────────
  sendOtp: (mobile: string) =>
    request<{ message: string; devOtp?: string }>("/api/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ mobile }),
    }),

  verifyOtp: (mobile: string, otp: string) =>
    request<{ token: string; user: import("./types").User }>(
      "/api/auth/verify-otp",
      {
        method: "POST",
        body: JSON.stringify({ mobile, otp }),
      },
    ),

  logout: () => request("/api/auth/logout", { method: "POST" }),

  // ─── LR (driver) ───────────────────────────────────────────────────────
  getLRs: (status?: string, search?: string) => {
    const qs = new URLSearchParams();
    if (status && status !== "all") qs.set("status", status);
    if (search) qs.set("search", search);
    const tail = qs.toString();
    return request<import("./types").LRRequest[]>(
      `/api/lr${tail ? `?${tail}` : ""}`,
    );
  },

  getLR: (id: string) =>
    request<import("./types").LRRequest>(`/api/lr/${id}`),

  createLR: (body: Record<string, unknown>) =>
    request<import("./types").LRRequest>("/api/lr", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // ─── LR actions ────────────────────────────────────────────────────────
  approveLR: (id: string) =>
    request(`/api/lr/${id}/approve`, { method: "PUT" }),

  rejectLR: (id: string, reason: string) =>
    request(`/api/lr/${id}/reject`, {
      method: "PUT",
      body: JSON.stringify({ reason }),
    }),

  markDelivered: (id: string) =>
    request(`/api/lr/${id}/delivered`, { method: "PUT" }),

  // ─── Uploads (driver) ──────────────────────────────────────────────────
  uploadPhoto: (dataUri: string) =>
    request<{ url: string; bytes: number; mime: string }>(
      "/api/upload/photo",
      {
        method: "POST",
        body: JSON.stringify({ data: dataUri }),
      },
    ),

  uploadSignature: (dataUri: string) =>
    request<{ url: string; bytes: number; mime: string }>(
      "/api/upload/signature",
      {
        method: "POST",
        body: JSON.stringify({ data: dataUri }),
      },
    ),

  // ─── Company admin ─────────────────────────────────────────────────────
  getDashboard: () =>
    request<{
      stats: import("./types").DashboardStats;
      recentLrs: import("./types").LRRequest[];
      topRoutes?: { route: string; count: number; freight: number }[];
      quota?: {
        branches: { used: number; max: number };
        drivers: { used: number; max: number };
        lrs: { used: number; max: number };
      };
    }>("/api/company/dashboard"),

  getDrivers: () =>
    request<
      Array<{
        id: string;
        name: string;
        mobile: string;
        status: string;
        lrsThisMonth: number;
        branch?: { id: string; name: string; city: string } | null;
      }>
    >("/api/drivers"),

  inviteDriver: (mobile: string, branchId: string, name?: string) =>
    request<{ id: string }>("/api/drivers/invite", {
      method: "POST",
      body: JSON.stringify({ mobile, branchId, name }),
    }),

  removeDriver: (id: string) =>
    request(`/api/drivers/${id}`, { method: "DELETE" }),

  getBranches: () =>
    request<
      Array<{
        id: string;
        name: string;
        city: string;
        state: string;
        driverCount: number;
        lrsThisMonth: number;
      }>
    >("/api/branches"),

  getCompanyProfile: () => request<import("./types").Company>("/api/company/profile"),

  updateCompanyProfile: (
    body: Partial<{
      name: string;
      address: string;
      gstNumber: string;
      logoUrl: string;
      stampUrl: string;
    }>,
  ) =>
    request<import("./types").Company>("/api/company/profile", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // ─── Notifications ─────────────────────────────────────────────────────
  getNotifications: () =>
    request<
      Array<{
        id: string;
        title: string;
        message: string;
        lrId?: string;
        read: boolean;
        createdAt: string;
      }>
    >("/api/notifications"),
};

export { API_URL };
