import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { api, clearToken, getToken, setToken } from "./api";
import type { User } from "./types";

const USER_KEY = "rono_user";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (mobile: string, otp: string) => Promise<{ ok: boolean; error?: string }>;
  sendOtp: (mobile: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      const stored = await SecureStore.getItemAsync(USER_KEY);
      if (stored) setUser(JSON.parse(stored));
      setLoading(false);
    })();
  }, []);

  async function sendOtp(mobile: string) {
    const res = await api.sendOtp(mobile);
    return res.success ? { ok: true } : { ok: false, error: res.error };
  }

  async function login(mobile: string, otp: string) {
    const res = await api.verifyOtp(mobile, otp);
    if (!res.success || !res.data) {
      return { ok: false, error: res.error ?? "Login failed" };
    }
    await setToken(res.data.token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(res.data.user));
    setUser(res.data.user);
    return { ok: true };
  }

  async function logout() {
    await api.logout();
    await clearToken();
    await SecureStore.deleteItemAsync(USER_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, sendOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
