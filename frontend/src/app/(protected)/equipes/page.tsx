"use client";
import { useAuth } from "@/context/AuthProvider";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Team = { id: string; name: string; is_ours: boolean };

export default function TeamsPage() {
  const { user, logout } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!user) { router.replace("/login"); return; }
    api("/teams").then(setTeams).catch(e=>setErr(e.message));
  }, [user, router]);

  async function createTeam(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const t = await api("/teams", { method:"POST", body: JSON.stringify({ name, is_ours: true })});
      setTeams(prev => [t, ...prev]);
      setName("");
    } catch (e:any) { setErr(e.message); }
  }

  return (
    <main style={{maxWidth:720, margin:"20px auto", padding:12}}>
      <header style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <h1>Equipes</h1>
        <button onClick={logout}>Sair</button>
      </header>

      <form onSubmit={createTeam} style={{margin:"12px 0"}}>
        <input placeholder="Nome da equipe" value={name} onChange={e=>setName(e.target.value)} required style={{marginRight:8}}/>
        <button type="submit">Criar</button>
      </form>
      {err && <p style={{color:"crimson"}}>{err}</p>}

      <ul>
        {teams.map(t => (
          <li key={t.id} style={{padding:"8px 0", borderBottom:"1px solid #eee"}}>
            <strong>{t.name}</strong>
            {" - "}
            <Link href={`/jogadores?team_id=${t.id}`}>Jogadores</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
