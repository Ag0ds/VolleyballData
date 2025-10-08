"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function AdminPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        setAllowed(true);
      } catch {
        setAllowed(false);
      }
    })();
    return () => { on = false; };
  }, []);

  if (allowed === null) return <p>Verificando permissões…</p>;
  if (!allowed) return <p>Sem permissão.</p>;

  return (
    <main>
      <h1>Admin</h1>
      <p>Em breve: gestão de admins, reset de dados de teste, etc.</p>
    </main>
  );
}
