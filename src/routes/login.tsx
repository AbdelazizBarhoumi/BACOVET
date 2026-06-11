import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, ROLE_HOME, DEMO_ACCOUNTS } from "@/hooks/use-auth";
import { pushAudit } from "@/lib/audit";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "BACOVET — Pilotage Opérationnel" },
      { name: "description", content: "Accès privé au tableau de bord opérationnel BACOVET." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { login, session } = useAuth();
  const [show, setShow] = useState(false);
  const [matricule, setMatricule] = useState("");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState<string | null>(null);

  if (session) {
    return <Navigate to={ROLE_HOME[session.role]} />;
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matricule || !pwd) { setErr("Identifiants incorrects"); return; }
    const res = login(matricule, pwd);
    if (!res.ok) {
      setErr(res.error);
      pushAudit("WARN", `Tentative de connexion échouée: ${matricule}`);
      return;
    }
    pushAudit("USER", `Connexion réussie: ${matricule.toUpperCase()} (${res.role})`);
    navigate({ to: ROLE_HOME[res.role] });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

      <div className="relative w-full max-w-md mx-4">
        <div className="rounded-xl border border-border bg-card p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-6">
            <div className="h-14 w-14 rounded-lg bg-primary text-primary-foreground grid place-items-center font-mono text-2xl font-bold mb-3">B</div>
            <h1 className="text-xl font-bold tracking-[0.3em]">BACOVET</h1>
            <div className="text-[11px] tracking-[0.25em] text-muted-foreground uppercase mt-1">Pilotage Opérationnel</div>
            <div className="mt-4 flex items-center gap-2 text-[10px] font-mono tracking-wider text-primary/80">
              <ShieldCheck className="h-3 w-3" />
              <span>ACCÈS PRIVÉ</span>
              <span className="text-muted-foreground">|</span>
              <span>AUTHENTIFICATION UNIQUE</span>
            </div>
          </div>

          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">Matricule / EID</Label>
              <Input value={matricule} onChange={e => setMatricule(e.target.value)}
                className="bg-secondary border-border font-mono" placeholder="P-1042" autoComplete="username" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">Clé de sécurité</Label>
              <div className="relative">
                <Input type={show ? "text" : "password"} value={pwd} onChange={e => setPwd(e.target.value)}
                  className="bg-secondary border-border font-mono pr-10" placeholder="••••••••" autoComplete="current-password" />
                <button type="button" onClick={() => setShow(s => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {err && <div className="text-xs text-destructive font-mono">{err}</div>}
            <Button type="submit" className="w-full font-mono uppercase tracking-[0.18em] text-xs">
              Validation Identité <ArrowRight className="h-3 w-3 ml-2" />
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-[10px] font-mono uppercase tracking-wider">
            <span className="inline-flex items-center gap-1.5 text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Réseau local : connecté
            </span>
            <button type="button" onClick={() => { setMatricule(""); setPwd(""); setErr(null); }}
              className="text-muted-foreground hover:text-foreground">Réinitialiser</button>
          </div>
        </div>
        <p className="text-center text-[10px] font-mono tracking-[0.2em] text-muted-foreground mt-6 uppercase">
          Excellence industrielle — Propriété de BACOVET Group
        </p>
        <details className="mt-3 text-[10px] font-mono text-muted-foreground/80">
          <summary className="cursor-pointer text-center uppercase tracking-wider">Comptes de démonstration</summary>
          <div className="mt-2 rounded border border-border bg-card/40 p-3 space-y-0.5">
            <div className="text-[10px] mb-1 text-muted-foreground">Mot de passe : <span className="text-foreground">demo</span></div>
            {Object.entries(DEMO_ACCOUNTS).map(([mat, a]) => (
              <div key={mat} className="flex justify-between gap-3">
                <button type="button" onClick={() => { setMatricule(mat); setPwd("demo"); }}
                  className="text-primary hover:underline">{mat}</button>
                <span className="text-muted-foreground truncate">{a.name} · {a.role}</span>
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}
