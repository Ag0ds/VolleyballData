"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Team = { id: string; name: string; is_ours: boolean };
type Player = { id: string; name: string; number: number | null };

export default function JogadoresPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const teamIdParam = sp.get("team_id");

  const [teamId, setTeamId] = useState<string | null>(teamIdParam);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let on = true;
    setLoading(true);
    setErr(null);

    (async () => {
      try {
        if (!teamId) {
          const ts = await api("/teams");
          if (!on) return;
          setTeams(ts);
        } else {
          const ps = await api(`/players?team_id=${teamId}`);
          if (!on) return;
          setPlayers(ps);
        }
      } catch (e: any) {
        if (!on) return;
        setErr(e.message);
      } finally {
        if (on) setLoading(false);
      }
    })();

    return () => {
      on = false;
    };
  }, [teamId]);

  function pickTeam(id: string) {
    setTeamId(id);
    try { localStorage.setItem("lastTeamId", id); } catch {}
    router.replace(`/jogadores?team_id=${id}`);
  }
  if (!teamId) {
    return (
      <main>
        <h1>Jogadores</h1>
        <p>Selecione uma equipe para ver/cadastrar jogadores.</p>

        {loading ? <p>Carregando…</p> : (
          teams.length === 0 ? <p>Nenhuma equipe encontrada.</p> : (
            <ul style={{ marginTop: 8 }}>
              {teams.map(t => (
                <li key={t.id} style={{ padding: "6px 0", borderBottom: "1px solid #eee" }}>
                  <strong>{t.name}</strong> {t.is_ours ? "(nossa)" : "(adversária)"}{" "}
                  <button onClick={() => pickTeam(t.id)} style={{ marginLeft: 8 }}>
                    Selecionar
                  </button>
                </li>
              ))}
            </ul>
          )
        )}

        {err && <p style={{ color: "crimson" }}>{err}</p>}
      </main>
    );
  }
  return (
    <main>
      <h1>Jogadores</h1>
      <p style={{ color: "#666" }}>Equipe atual: {teamId}</p>

      {loading ? <p>Carregando…</p> : (
        players.length === 0 ? <p>Nenhum jogador nesta equipe ainda.</p> : (
          <ul style={{ marginTop: 8 }}>
            {players.map(p => (
              <li key={p.id} style={{ padding: "6px 0", borderBottom: "1px solid #eee" }}>
                {p.number != null ? `#${p.number} ` : ""}{p.name}
              </li>
            ))}
          </ul>
        )
      )}

      {err && <p style={{ color: "crimson" }}>{err}</p>}
    </main>
  );
}
