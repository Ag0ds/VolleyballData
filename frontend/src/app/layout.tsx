import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthProvider";

export const metadata: Metadata = { title: "Volley App", description: "MVP" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
