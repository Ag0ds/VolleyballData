"use client";
import { useAuth } from "@/context/AuthProvider";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { login, signup } = useAuth();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"login"|"signup">("login");
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      if (mode === "login") await login(email, pwd);
      else await signup(email, pwd, name);
      router.replace("/equipes");
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <main style={{ maxWidth: 360, margin: "40px auto", padding: 12 }}>
      <h1>{mode === "login" ? "Entrar" : "Criar conta"}</h1>
      <form onSubmit={submit}>
        {mode === "signup" && (
          <input placeholder="Nome" value={name} onChange={e=>setName(e.target.value)} required style={{display:"block",width:"100%",margin:"8px 0"}}/>
        )}
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required style={{display:"block",width:"100%",margin:"8px 0"}}/>
        <input placeholder="Senha" type="password" value={pwd} onChange={e=>setPwd(e.target.value)} required style={{display:"block",width:"100%",margin:"8px 0"}}/>
        {err && <p style={{color:"crimson"}}>{err}</p>}
        <button type="submit" style={{padding:8, width:"100%", marginTop:8}}>
          {mode === "login" ? "Entrar" : "Cadastrar"}
        </button>
      </form>
      <button onClick={()=>setMode(mode==="login"?"signup":"login")} style={{marginTop:12, width:"100%", padding:8}}>
        {mode==="login" ? "Criar conta" : "Já tenho conta"}
      </button>
    </main>
  );
}
