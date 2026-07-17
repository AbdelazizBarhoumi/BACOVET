import { useNavigate } from "@tanstack/react-router";
import { Loader2, Lock, Mail, ChevronRight, CheckCircle2 } from "lucide-react";
import React, { useState } from "react";

const EMAILS = [
  { email: "superadmin@bacovet.com", name: "Super admin" },
  { email: "m.chrifa@novationcity.com", name: "M. Chrifa" },
  { email: "benhadjmbareknourhene@gmail.com", name: "Ben Hadj Mbarek Nourhene" },
  { email: "intissar@bacovet.com", name: "Intissar" },
  { email: "azer.boughrara@bacovet.com", name: "Azer Boughrara" },
  { email: "amira@bacovet.com", name: "Amira" },
  { email: "qualite@bacovet.com", name: "Qualite" },
  { email: "saadia@bacovet.com", name: "Saadia" },
];

type Step = "email" | "password" | "create-password";

function getCsrfToken(): string {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export default function DataLoginPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [selectedEmail, setSelectedEmail] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSelectEmail = async (email: string, name: string) => {
    setSelectedEmail(email);
    setSelectedName(name);
    setError("");
    setPassword("");
    setConfirmPassword("");
    setLoading(true);
    try {
      const res = await fetch("/api/data-auth/check", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "X-Requested-With": "XMLHttpRequest", "X-XSRF-TOKEN": getCsrfToken() },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Erreur"); return; }
      setStep(data.has_password ? "password" : "create-password");
    } catch { setError("Erreur réseau"); } finally { setLoading(false); }
  };

  const handleCreatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) { setError("Les mots de passe ne correspondent pas."); return; }
    if (password.length < 4) { setError("Le mot de passe doit faire au moins 4 caractères."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/data-auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "X-Requested-With": "XMLHttpRequest", "X-XSRF-TOKEN": getCsrfToken() },
        body: JSON.stringify({ email: selectedEmail, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Erreur"); return; }
      localStorage.setItem("data_auth_user", JSON.stringify(data.user));
      navigate({ to: "/v1/data" });
    } catch { setError("Erreur réseau"); } finally { setLoading(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/data-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "X-Requested-With": "XMLHttpRequest", "X-XSRF-TOKEN": getCsrfToken() },
        body: JSON.stringify({ email: selectedEmail, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Erreur de connexion"); return; }
      localStorage.setItem("data_auth_user", JSON.stringify(data.user));
      navigate({ to: "/v1/data" });
    } catch { setError("Erreur réseau"); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-card border border-border rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Mapping KPIs</h1>
          </div>

          {step === "email" && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-3">Sélectionnez votre compte :</p>
              {EMAILS.map((u) => (
                <button key={u.email} onClick={() => handleSelectEmail(u.email, u.name)} disabled={loading}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md border border-border hover:bg-secondary/50 transition-colors cursor-pointer text-left disabled:opacity-50">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">{u.name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{u.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{u.email}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}

          {step === "create-password" && (
            <form onSubmit={handleCreatePassword} className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Bienvenue, <strong>{selectedName}</strong></span>
              </div>
              <p className="text-xs text-muted-foreground">Créez votre mot de passe pour la première connexion.</p>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Nouveau mot de passe</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" autoFocus required />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Confirmer</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••"
                  className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" required />
              </div>
              {error && <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">{error}</div>}
              <div className="flex gap-2">
                <button type="button" onClick={() => { setStep("email"); setPassword(""); setConfirmPassword(""); setError(""); }}
                  className="text-xs px-3 py-2 rounded-md border border-border hover:bg-secondary cursor-pointer">Retour</button>
                <button type="submit" disabled={loading || !password || !confirmPassword}
                  className="flex-1 flex items-center justify-center gap-2 text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Créer et se connecter
                </button>
              </div>
            </form>
          )}

          {step === "password" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Mail className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground"><strong>{selectedName}</strong></span>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Mot de passe</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" autoFocus required />
              </div>
              {error && <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">{error}</div>}
              <div className="flex gap-2">
                <button type="button" onClick={() => { setStep("email"); setPassword(""); setError(""); }}
                  className="text-xs px-3 py-2 rounded-md border border-border hover:bg-secondary cursor-pointer">Retour</button>
                <button type="submit" disabled={loading || !password}
                  className="flex-1 flex items-center justify-center gap-2 text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Connexion
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
