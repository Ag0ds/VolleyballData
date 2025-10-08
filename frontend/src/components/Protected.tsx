"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { getToken } from "@/lib/api";

export default function Protected({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  useEffect(() => {
    setMounted(true);
    try {
      const t = getToken();
      setHasToken(!!t);
    } catch {
      setHasToken(false);
    }
  }, []);
  useEffect(() => {
    if (!mounted) return;
    if (hasToken === false) {
      router.replace("/login");
    }
  }, [mounted, hasToken, router]);
  if (!mounted) {
    return <div style={{ padding: 24, textAlign: "center" }}>Carregando…</div>;
  }
  if (hasToken === false) return null;
  if (!user) {
    return <div style={{ padding: 24, textAlign: "center" }}>Carregando…</div>;
  }

  return <>{children}</>;
}
