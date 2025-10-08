"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

type Team = { id: string; name: string; is_ours: boolean };

export default function NovoProjetoPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const preTeam = sp.get("team_id") || "";

  const [teamsOurs, setTeamsOurs] = useState<Team[]>([]);
  const [teamsOpp, setTeamsOpp] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState<string>(preTeam);
  const [opponentTeamId, setOpponentTeamId] = useState<string>("");
  const [opponentName, setOpponentName] = useState<string>("");
  const [kind, setKind] = useState<"training" | "match">("training");
  const [evalLevel, setEvalLevel] = useState<"simple" | "medium" | "advanced">("simple");
  const [bestOf, setBestOf] = useState<number>(5);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const all: Team[] = await api("/teams");
        if (!on) return;
        setTeamsOurs(all.filter(t => t.is_ours));
        setTeamsOpp(all.filter(t => !t.is_ours));
        if (preTeam && !all.some(t => t.id === preTeam && t.is_ours)) {
          setTeamId("");
        }
      } catch (e: any) {
        if (on) setErr(e.message);
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => { on = false; };
  }, [preTeam]);
  useEffect(() => {
    if (!opponentTeamId) return;
    const t = teamsOpp.find(t => t.id === opponentTeamId);
    if (t) setOpponentName(t.name);
  }, [opponentTeamId, teamsOpp]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!teamId) { setErr("Selecione uma equipe nossa."); return; }
    try {
      const payload = {
        team_id: teamId,
        kind,
        eval_level: evalLevel,
        opponent_name: opponentName || null,
        best_of: bestOf,
      };
      const s = await api("/sessions", { method: "POST", body: JSON.stringify(payload) });
      router.replace(`/sessao/${s.id}?team_id=${teamId}`);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <main style={{ padding: 16 }}>
      <h1>Novo projeto</h1>
      {loading ? <p>Carregando…</p> : (
        <form onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(280px, 1fr))", gap: 12, maxWidth: 800 }}>
          <label>Equipe (nossa) *
            <select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <option value="">Selecione…</option>
              {teamsOurs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>

          <label>Equipe adversária (opcional)
            <select value={opponentTeamId} onChange={(e) => setOpponentTeamId(e.target.value)}>
              <option value="">(nenhuma / texto livre)</option>
              {teamsOpp.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>

          <label>Nome adversário (livre)
            <input type="text" value={opponentName} onChange={(e) => setOpponentName(e.target.value)} placeholder="Ex.: Vôlei X" />
          </label>

          <label>Tipo de sessão
            <select value={kind} onChange={(e) => setKind(e.target.value as any)}>
              <option value="training">Treino</option>
              <option value="match">Jogo oficial</option>
            </select>
          </label>

          <label>Nível de avaliação
            <select value={evalLevel} onChange={(e) => setEvalLevel(e.target.value as any)}>
              <option value="simple">Simples</option>
              <option value="medium">Médio</option>
              <option value="advanced">Avançado</option>
            </select>
          </label>

          <label>Best of
            <input type="number" min={1} max={7} value={bestOf} onChange={(e) => setBestOf(Number(e.target.value))} />
          </label>

          <div style={{ gridColumn: "1 / -1" }}>
            <button type="submit">Criar sessão</button>
            {err && <span style={{ color: "crimson", marginLeft: 12 }}>{err}</span>}
          </div>
        </form>
      )}
    </main>
  );
}
