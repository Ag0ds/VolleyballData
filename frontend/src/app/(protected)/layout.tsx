"use client";
import Protected from "@/components/Protected";
import TopNav from "@/components/TopNav";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <Protected>
      <TopNav />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px" }}>
        {children}
      </div>
    </Protected>
  );
}
