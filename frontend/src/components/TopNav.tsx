"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Início" },
  { href: "/equipes", label: "Equipes" },
  { href: "/jogadores", label: "Jogadores" },
  { href: "/novo-projeto", label: "Novo projeto" },
  { href: "/sessao", label: "Sessões" },
  { href: "/admin", label: "Admin" },
];

export default function TopNav() {
  const pathname = usePathname();
  return (
    <header style={{
      borderBottom: "1px solid #eee",
      position: "sticky",
      top: 0,
      background: "#fff",
      zIndex: 10
    }}>
      <nav style={{
        display: "flex",
        gap: 12,
        padding: "10px 16px",
        maxWidth: 1200,
        margin: "0 auto"
      }}>
        {items.map(it => {
          const active = pathname === it.href || (it.href !== "/" && pathname?.startsWith(it.href));
          return (
            <Link key={it.href} href={it.href}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                textDecoration: "none",
                color: active ? "#111" : "#444",
                background: active ? "#f2f2f2" : "transparent"
              }}>
              {it.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
