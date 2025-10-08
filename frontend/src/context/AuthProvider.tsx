"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { api, setToken, getToken } from "@/lib/api";

type User = { id: string; email: string; full_name?: string };
type AuthCtx = {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, full_name?: string) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    const tok = getToken();
    if (!tok) return;
    api("/me").then((res) => setUser({ id: res.user_id, email: res.profile?.email }))
      .catch(() => setToken(null));
  }, []);

  async function login(email: string, password: string) {
    const res = await api("/auth/login", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ email, password }),
    });
    setToken(res.access_token);
    setUser({ id: res.user.id, email: res.user.email, full_name: res.user.user_metadata?.full_name });
  }

  async function signup(email: string, password: string, full_name?: string) {
    await api("/auth/signup", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ email, password, full_name }),
    });
    await login(email, password);
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  return <Ctx.Provider value={{ user, login, signup, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
