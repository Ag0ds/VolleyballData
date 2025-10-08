"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type Row = {
  id: string;
  created_at: string;
  status: "open" | "closed";
  kind: "training" | "match";
  eval_level: "simple" | "medium" | "advanced";
  team_id: string;
  opponent_name: string | null;
};

export default function SessionsListPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const all: Row[] = await api("/sessions");
        if (!on) return;
        setRows(all);
      } catch (e: any) {
        if (on) setErr(e.message);
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => { on = false; };
  }, []);

  const list = rows.filter(r => (onlyOpen ? r.status === "open" : true));

  return (
    <main style={{ padding: 16 }}>
      <h1>Sessões</h1>
      <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />
        mostrar apenas abertas
      </label>

      {loading ? <p>Carregando…</p> : err ? <p style={{ color: "crimson" }}>{err}</p> : (
        list.length === 0 ? <p>Nenhuma sessão encontrada.</p> : (
          <table style={{ marginTop: 12, width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>Criada em</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>Tipo</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>Nível</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>Status</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>Adversário</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.map(r => (
                <tr key={r.id}>
                  <td>{new Date(r.created_at).toLocaleString()}</td>
                  <td>{r.kind}</td>
                  <td>{r.eval_level}</td>
                  <td>{r.status}</td>
                  <td>{r.opponent_name ?? "-"}</td>
                  <td>
                    <Link className="btn" href={`/sessao/${r.id}?team_id=${r.team_id}`}>Abrir</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </main>
  );
}
