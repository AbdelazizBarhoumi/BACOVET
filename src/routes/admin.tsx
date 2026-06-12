import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { AppShell } from "@/components/app-shell";
import { Panel } from "@/components/widgets";
import { adminData } from "@/lib/mock";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Plus, Monitor, Trash2, AlertTriangle } from "lucide-react";
import { useLiveData } from "@/hooks/use-live-data";
import { ROLE_LABEL, type Role, auth, useAuth } from "@/hooks/use-auth";
import {
  getAudit,
  isAuditEnabled,
  pushAudit,
  setAuditEnabled,
  clearAudit,
  type AuditEntry,
} from "@/lib/audit";
import { fetchAllJobs, runJobManually } from "@/services/adminApi";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  beforeLoad: ({ location }) => {
    if (typeof window === "undefined") return;

    if (!auth.session) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
    if (!auth.hasAccess("/admin")) {
      throw redirect({ to: "/unauthorized" });
    }
  },
  head: () => ({ meta: [{ title: "Administration — BACOVET" }] }),
  component: AdminPage,
});

type User = {
  id: string;
  name: string;
  matricule: string;
  role: Role;
  email: string;
  active: boolean;
  password?: string;
};

const USERS_KEY = "bacovet-users";
const SCREENS_KEY = "bacovet-screens";

function loadUsers(): User[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(USERS_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      /* ignore */
    }
  }
  return (adminData.users as User[]).map((u, i) => ({
    id: `u${i}`,
    name: u.name,
    matricule: u.matricule ?? "",
    role: u.role as Role,
    email: u.email,
    active: u.active,
  }));
}
function saveUsers(u: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(u));
}

type Screen = { name: string; online: boolean; view: string };
function loadScreens(): Screen[] {
  if (typeof window === "undefined") return adminData.screens;
  const raw = localStorage.getItem(SCREENS_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      /* ignore */
    }
  }
  return adminData.screens;
}
function saveScreens(s: Screen[]) {
  localStorage.setItem(SCREENS_KEY, JSON.stringify(s));
}

function AdminPage() {
  const { session } = useAuth();
  const { lastSync, refreshIntervalSec, setRefreshIntervalSec, forceSync } = useLiveData();
  const [mounted, setMounted] = useState(false);
  const [jobs, setJobs] = useState<
    {
      id: number;
      name: string;
      description?: string;
      last_status: string;
      last_run: string;
      active: boolean;
    }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [auditOn, setAuditOn] = useState<boolean>(true);
  const [editing, setEditing] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const prevLogCount = useRef<number>(0);

  const loadJobs = useCallback(async () => {
    if (!session?.token) return;
    try {
      const data = await fetchAllJobs(session.token);
      const normalized = (Array.isArray(data) ? data : []).map((j: any) => ({
        id: j.id,
        name: j.name || j.nom || j.label || "",
        description: j.description || j.last_message || "",
        last_status: j.last_status,
        last_run: j.last_run,
        active: j.active !== undefined ? j.active : j.actif,
      }));
      setJobs(normalized);
      setError(null);
    } catch (err) {
      console.error("Failed to load jobs", err);
      setError("Impossible de contacter le serveur Novacity API");
    } finally {
      setLoading(false);
    }
  }, [session?.token]);

  useEffect(() => {
    setMounted(true);
    setUsers(loadUsers());
    setScreens(loadScreens());
    setLogs(getAudit());
    setAuditOn(isAuditEnabled());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    loadJobs();
    const id = setInterval(loadJobs, 60000);
    return () => clearInterval(id);
  }, [mounted, loadJobs]);

  useEffect(() => {
    const refresh = () => setLogs(getAudit());
    window.addEventListener("bacovet-audit", refresh);
    const id = setInterval(refresh, 2000);
    return () => {
      window.removeEventListener("bacovet-audit", refresh);
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (logEndRef.current && logs.length > prevLogCount.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
    prevLogCount.current = logs.length;
  }, [logs]);

  useEffect(() => {
    if (mounted) saveUsers(users);
  }, [users, mounted]);
  useEffect(() => {
    if (mounted) saveScreens(screens);
  }, [screens, mounted]);

  if (!mounted) return null;

  const sources = [
    { name: "ERP DIVA", match: /DIVA|Stock/i },
    { name: "GPRO-PROD", match: /GPRO|Prod|Chaine|Efficience/i },
    { name: "Google Drive", match: /Drive|Spreadsheet/i },
  ];

  const apiStatus = sources.map((s) => {
    const sourceJobs = jobs.filter(
      (j) => s.match.test(j.name || "") || s.match.test(j.description || ""),
    );
    const hasError = sourceJobs.some((j) => j.last_status !== "ok");
    const latestRun = Math.max(...sourceJobs.map((j) => new Date(j.last_run).getTime()), 0);
    const isStale = latestRun > 0 && Date.now() - latestRun > 120000;

    let status: "ok" | "error" | "stale" = "ok";
    if (error || hasError) status = "error";
    else if (isStale) status = "stale";

    return {
      name: s.name,
      status,
      last:
        latestRun > 0
          ? `il y a ${Math.floor((Date.now() - latestRun) / 60000)} min`
          : error
            ? "Erreur"
            : "Jamais",
      jobs: sourceJobs,
    };
  });

  const inactiveBundlingIds = [60, 61, 54, 55];
  const bundlingInactive =
    jobs.length > 0 &&
    jobs.some((j) => inactiveBundlingIds.includes(Number(j.id)) && j.active === false);

  const handleRunJob = async (id: number | string) => {
    if (!session?.token) return;
    try {
      await runJobManually(id, session.token);
      toast.success("Job lancé avec succès");
      pushAudit("SYSTEM", `Job lancé manuellement: ID ${id}`);
      loadJobs();
    } catch (err) {
      toast.error("Échec du lancement du job");
    }
  };

  const deleteUser = (id: string) => {
    const u = users.find((x) => x.id === id);
    setUsers(users.filter((x) => x.id !== id));
    if (u) pushAudit("USER", `Utilisateur supprimé: ${u.email}`);
  };

  const toggleActive = (id: string) => {
    const u = users.find((x) => x.id === id);
    if (!u) return;
    const nextActive = !u.active;
    setUsers(users.map((x) => (x.id === id ? { ...x, active: nextActive } : x)));
    pushAudit("USER", `Utilisateur ${nextActive ? "activé" : "désactivé"}: ${u.email}`);
  };

  const statusMeta = (status: "ok" | "error" | "stale") => {
    switch (status) {
      case "ok":
        return { dot: "bg-success", text: "text-success", label: "200 OK" };
      case "error":
        return { dot: "bg-destructive", text: "text-destructive", label: "ERREUR" };
      case "stale":
        return { dot: "bg-warning", text: "text-warning", label: "STALE" };
    }
  };

  return (
    <AppShell page="/admin" title="Administration" subtitle="Panneau de contrôle système">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 space-y-3">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg flex items-center gap-3 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <div className="text-xs font-bold uppercase">{error}</div>
            </div>
          )}

          {bundlingInactive && (
            <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg flex items-center gap-3 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <div className="text-xs">
                <p className="font-bold uppercase">
                  Attention : 4 requêtes BR Bundling sont inactives.
                </p>
                <p>Contactez Novacity pour activation (Blocker B-01).</p>
              </div>
            </div>
          )}

          <Panel title="Configuration globale">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Fréquence de rafraîchissement (secondes)
                </Label>
                <Input
                  type="number"
                  min={10}
                  max={600}
                  value={refreshIntervalSec}
                  onChange={(e) =>
                    setRefreshIntervalSec(Math.max(10, Math.min(600, Number(e.target.value) || 60)))
                  }
                  className="w-32 font-mono"
                />
              </div>
              <Button
                size="sm"
                onClick={() => {
                  forceSync();
                  pushAudit("SYSTEM", "Sync globale forcée");
                }}
              >
                Forcer la synchronisation
              </Button>
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground ml-auto">
                Dernière sync:{" "}
                <span className="text-foreground">
                  {lastSync ? new Date(lastSync).toLocaleTimeString() : "—"}
                </span>
              </div>
            </div>
          </Panel>

          <Panel title="Supervision des flux API">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono border-b border-border">
                  <th className="text-left py-2">Source</th>
                  <th className="text-left">Statut</th>
                  <th className="text-left">Dernière sync</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {apiStatus.map((a) => {
                  const meta = statusMeta(a.status);
                  return (
                    <tr key={a.name} className="border-b border-border/50">
                      <td className="py-2 font-bold">{a.name}</td>
                      <td>
                        <span className="inline-flex items-center gap-2 text-xs">
                          <span
                            className={`h-2 w-2 rounded-full ${meta.dot} ${
                              a.status === "ok" ? "animate-pulse" : ""
                            }`}
                          />
                          <span className={meta.text}>{meta.label}</span>
                        </span>
                      </td>
                      <td className="text-muted-foreground text-xs">{a.last}</td>
                      <td className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (a.jobs.length > 0) {
                              handleRunJob(a.jobs[0].id);
                            } else {
                              forceSync();
                              pushAudit("SYSTEM", `Sync globale forcée via ${a.name}`);
                            }
                          }}
                          className="h-7 text-[10px] uppercase tracking-wider"
                        >
                          Exécuter Maintenant
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>

          <Panel
            title="Gestion des comptes"
            right={
              <Dialog open={creating} onOpenChange={setCreating}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-7 text-[10px] uppercase tracking-wider">
                    <Plus className="h-3 w-3 mr-1" /> Ajouter utilisateur
                  </Button>
                </DialogTrigger>
                <UserDialog
                  onSave={(u) => {
                    setUsers([...users, { ...u, id: `u${Date.now()}` }]);
                    pushAudit("USER", `Utilisateur créé: ${u.email} (${u.role})`);
                    setCreating(false);
                  }}
                  onCancel={() => setCreating(false)}
                />
              </Dialog>
            }
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono border-b border-border">
                  <th className="text-left py-2">Utilisateur</th>
                  <th className="text-left">Matricule</th>
                  <th className="text-left">Rôle</th>
                  <th className="text-left">Email</th>
                  <th className="text-left">Statut</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border/50">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-secondary grid place-items-center text-[10px] font-bold">
                          {u.name
                            .split(" ")
                            .map((s) => s[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        {u.name}
                      </div>
                    </td>
                    <td className="text-muted-foreground text-xs uppercase">
                      {u.matricule || "—"}
                    </td>
                    <td className="text-muted-foreground">{ROLE_LABEL[u.role]}</td>
                    <td className="text-muted-foreground text-xs">{u.email}</td>
                    <td>
                      <button
                        onClick={() => toggleActive(u.id)}
                        className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-wider ${
                          u.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {u.active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => setEditing(u)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive"
                        onClick={() => deleteUser(u.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Total utilisateurs : <span className="text-foreground">{users.length}</span>
            </div>
            <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
              {editing && (
                <UserDialog
                  initial={editing}
                  isEditing={true}
                  onSave={(u) => {
                    setUsers(users.map((x) => (x.id === editing.id ? { ...editing, ...u } : x)));
                    pushAudit("USER", `Utilisateur modifié: ${u.email}`);
                    setEditing(null);
                  }}
                  onCancel={() => setEditing(null)}
                />
              )}
            </Dialog>
          </Panel>

          <Panel
            title="Journal d'audit système"
            right={
              <div className="flex items-center gap-4">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm("Effacer tous les logs ?")) {
                      clearAudit();
                      setLogs(getAudit());
                    }
                  }}
                  className="h-7 text-[10px] uppercase tracking-wider text-destructive"
                >
                  <Trash2 className="h-3 w-3 mr-1" /> Effacer les logs
                </Button>
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
                  Enregistrement actif
                  <Switch
                    checked={auditOn}
                    onCheckedChange={(v) => {
                      setAuditOn(v);
                      setAuditEnabled(v);
                      pushAudit("SYSTEM", `Audit ${v ? "activé" : "désactivé"}`);
                    }}
                  />
                </div>
              </div>
            }
          >
            <div className="space-y-1 font-mono text-xs max-h-80 overflow-auto">
              {logs.length === 0 && (
                <div className="text-muted-foreground italic">Aucun événement enregistré.</div>
              )}
              {logs.map((l, i) => {
                const color =
                  l.lvl === "ERROR"
                    ? "text-destructive"
                    : l.lvl === "WARN"
                      ? "text-warning"
                      : l.lvl === "USER"
                        ? "text-chart-4"
                        : l.lvl === "SYSTEM"
                          ? "text-primary"
                          : "text-success";
                return (
                  <div key={i} className="flex gap-2 py-1 border-b border-border/30">
                    <span className="text-muted-foreground">[{l.t}]</span>
                    <span className={`${color} font-bold w-16`}>[{l.lvl}]</span>
                    <span className="text-foreground/90">{l.msg}</span>
                  </div>
                );
              })}
              <div ref={logEndRef} />
            </div>
          </Panel>
        </div>

        <div className="space-y-3">
          <Panel title="Écrans TV">
            <div className="space-y-2">
              {screens.map((s, i) => (
                <div key={s.name} className="rounded-md border border-border bg-secondary/40 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-bold">{s.name}</span>
                    </div>
                    <button
                      onClick={() => {
                        const next = [...screens];
                        next[i] = { ...s, online: !s.online };
                        setScreens(next);
                        pushAudit(
                          "SYSTEM",
                          `Écran ${s.name}: ${!s.online ? "en ligne" : "hors ligne"}`,
                        );
                      }}
                      className={`text-[10px] font-mono uppercase ${
                        s.online ? "text-success" : "text-destructive"
                      }`}
                    >
                      {s.online ? "En ligne" : "Hors ligne"}
                    </button>
                  </div>
                  <Select
                    value={s.view}
                    onValueChange={(v) => {
                      const next = [...screens];
                      next[i] = { ...s, view: v };
                      setScreens(next);
                      pushAudit("SYSTEM", `Écran ${s.name} → ${v}`);
                    }}
                  >
                    <SelectTrigger className="h-7 text-[10px] font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "Qualité (100)",
                        "Production / Confection",
                        "Production / Coupe",
                        "Production / Sérigraphie",
                        "Logistique (300)",
                        "Méthodes",
                        "Développement (350)",
                      ].map((v) => (
                        <SelectItem key={v} value={v} className="text-[10px] font-mono">
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="mt-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Total écrans : <span className="text-foreground">{screens.length}</span>
              {" · "}
              En ligne :{" "}
              <span className="text-success">{screens.filter((s) => s.online).length}</span>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}

function UserDialog({
  initial,
  isEditing,
  onSave,
  onCancel,
}: {
  initial?: Partial<User>;
  isEditing?: boolean;
  onSave: (u: Omit<User, "id">) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [matricule, setMatricule] = useState(initial?.matricule ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [role, setRole] = useState<Role>(initial?.role ?? "resp_production");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [active, setActive] = useState<boolean>(initial?.active ?? true);

  const handleSave = () => {
    if (!name || !email || !matricule) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }
    if (!isEditing && password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    onSave({ name, matricule, email, role, active, password: password || undefined });
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="text-sm uppercase tracking-wider font-mono text-primary flex items-center gap-2">
          {isEditing ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {isEditing ? "Modifier utilisateur" : "Ajouter utilisateur"}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-3 py-2">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Nom complet
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="font-mono h-9"
            />
          </div>
          <div>
            <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Matricule / EID
            </Label>
            <Input
              value={matricule}
              onChange={(e) => setMatricule(e.target.value)}
              className="font-mono h-9 uppercase"
              placeholder="EID-000"
            />
          </div>
        </div>
        <div>
          <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Email professionnel
          </Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="font-mono h-9"
            placeholder="nom@bacovet.com"
          />
        </div>
        <div>
          <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Rôle système
          </Label>
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger className="font-mono h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                <SelectItem key={r} value={r} className="font-mono text-xs">
                  {ROLE_LABEL[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!isEditing && (
          <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 mt-1">
            <div>
              <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Mot de passe
              </Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="font-mono h-9"
              />
            </div>
            <div>
              <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Confirmer
              </Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="font-mono h-9"
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Switch checked={active} onCheckedChange={setActive} />
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Compte actif
          </span>
        </div>
      </div>
      <DialogFooter className="gap-2">
        <Button variant="ghost" onClick={onCancel} className="text-[10px] uppercase tracking-wider">
          Annuler
        </Button>
        <Button onClick={handleSave} className="text-[10px] uppercase tracking-wider px-6">
          {isEditing ? "Mettre à jour" : "Créer le compte"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
