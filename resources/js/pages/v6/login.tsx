import { Head, router } from "@inertiajs/react";
import { CheckCircle2, ChevronRight, Loader2, Lock, Mail } from "lucide-react";
import React, { useState } from "react";

const EMAILS = [
  { email: "superadmin@bacovet.com", name: "Super admin" },
  { email: "direction@bacovet.com", name: "Direction" },
  { email: "resp.production@bacovet.com", name: "Resp. Production" },
  { email: "qualite@bacovet.com", name: "Qualité" },
];

type Step = "email" | "password" | "create-password";

function getCsrfToken(): string {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export default function V6LoginPage() {
  const [step, setStep] = useState<Step>("email");
  const [selectedEmail, setSelectedEmail] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const headers = { "Content-Type": "application/json", Accept: "application/json", "X-Requested-With": "XMLHttpRequest", "X-XSRF-TOKEN": getCsrfToken() };

  const selectEmail = async (email: string, name: string) => {
    setSelectedEmail(email); setSelectedName(name); setError(""); setLoading(true);
    try {
      const res = await fetch("/api/v6-auth/check", { method: "POST", headers, body: JSON.stringify({ email }) });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Erreur"); return; }
      setStep(data.has_password ? "password" : "create-password");
    } catch { setError("Erreur réseau"); } finally { setLoading(false); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (step === "create-password" && password !== confirmPassword) { setError("Les mots de passe ne correspondent pas."); return; }
    setLoading(true);
    try {
      const endpoint = step === "create-password" ? "/api/v6-auth/set-password" : "/api/v6-auth/login";
      const res = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify({ email: selectedEmail, password }) });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Erreur de connexion"); return; }
      router.visit("/v6");
    } catch { setError("Erreur réseau"); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Head title="Connexion V6 — BACOVET" />
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-6"><Lock className="h-5 w-5 text-primary" /><h1 className="text-lg font-semibold">Dashboard V6</h1></div>
        {step === "email" ? <div className="space-y-2"><p className="text-xs text-muted-foreground mb-3">Sélectionnez votre compte :</p>{EMAILS.map((u) => <button key={u.email} onClick={() => selectEmail(u.email, u.name)} disabled={loading} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md border border-border hover:bg-secondary/50 text-left disabled:opacity-50"><div className="w-8 h-8 rounded-full bg-primary/10 grid place-items-center"><span className="text-xs font-bold text-primary">{u.name[0]}</span></div><div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{u.name}</div><div className="text-[10px] text-muted-foreground truncate">{u.email}</div></div><ChevronRight className="h-4 w-4 text-muted-foreground" /></button>)}</div> : <form onSubmit={submit} className="space-y-4"><div className="flex items-center gap-2">{step === "password" ? <Mail className="h-4 w-4 text-primary" /> : <CheckCircle2 className="h-4 w-4 text-green-500" />}<span className="text-xs text-muted-foreground"><strong>{selectedName}</strong></span></div><p className="text-xs text-muted-foreground">{step === "password" ? "Entrez votre mot de passe." : "Créez votre mot de passe pour la première connexion."}</p><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary" autoFocus required />{step === "create-password" && <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirmer le mot de passe" className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary" required />}{error && <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">{error}</div>}<div className="flex gap-2"><button type="button" onClick={() => { setStep("email"); setPassword(""); setConfirmPassword(""); setError(""); }} className="text-xs px-3 py-2 rounded-md border border-border">Retour</button><button type="submit" disabled={loading || !password} className="flex-1 flex items-center justify-center gap-2 text-sm px-4 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50">{loading && <Loader2 className="h-4 w-4 animate-spin" />} {step === "password" ? "Connexion" : "Créer et se connecter"}</button></div></form>}
      </div>
    </div>
  );
}
