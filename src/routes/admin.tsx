import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { Pencil, Plus, Monitor, Trash2 } from "lucide-react";
import { useLiveData } from "@/hooks/use-live-data";
import { ROLE_LABEL, type Role, auth } from "@/hooks/use-auth";
import { getAudit, isAuditEnabled, pushAudit, setAuditEnabled, type AuditEntry } from "@/lib/audit";

export const Route = createFileRoute("/admin")({
  beforeLoad: ({ location }) => {
    // Skip redirect on server to avoid flicker. 
    // Client-side hydration will handle the redirect if session is missing.
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

type User = { id: string; name: string; role: Role; email: string; active: boolean };

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
  return adminData.users.map((u, i) => ({
    id: `u${i}`,
    name: u.name,
    role: "resp_production" as Role,
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
  const { lastSync, refreshIntervalSec, setRefreshIntervalSec, forceSync } = useLiveData();
  const [users, setUsers] = useState<User[]>(() => loadUsers());
  const [screens, setScreens] = useState<Screen[]>(() => loadScreens());
  const [logs, setLogs] = useState<AuditEntry[]>(() => getAudit());
  const [auditOn, setAuditOn] = useState<boolean>(() => isAuditEnabled());
  const [editing, setEditing] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);

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
    saveUsers(users);
  }, [users]);
  useEffect(() => {
    saveScreens(screens);
  }, [screens]);

  const apis = adminData.apis.map((a) => ({
    ...a,
    last: `il y a ${Math.floor((Date.now() - lastSync) / 1000)} s`,
  }));

  const deleteUser = (id: string) => {
    const u = users.find((x) => x.id === id);
    setUsers(users.filter((x) => x.id !== id));
    if (u) pushAudit("USER", `Utilisateur supprimé: ${u.email}`);
  };

  const toggleActive = (id: string) => {
    setUsers(users.map((u) => (u.id === id ? { ...u, active: !u.active } : u)));
    const u = users.find((x) => x.id === id);
    if (u) pushAudit("USER", `Utilisateur ${u.active ? "désactivé" : "activé"}: ${u.email}`);
  };

  return (
    <AppShell page="/admin" title="Administration" subtitle="Panneau de contrôle système">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 space-y-3">
          {/* Refresh-rate config */}
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
                <span className="text-foreground">{new Date(lastSync).toLocaleTimeString()}</span>
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
                {apis.map((a) => (
                  <tr key={a.name} className="border-b border-border/50">
                    <td className="py-2 font-bold">{a.name}</td>
                    <td>
                      <span className="inline-flex items-center gap-2 text-xs">
                        <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                        <span className="text-success">200 OK</span>
                      </span>
                    </td>
                    <td className="text-muted-foreground text-xs">{a.last}</td>
                    <td className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          forceSync();
                          pushAudit("SYSTEM", `Job forcé: ${a.name}`);
                        }}
                        className="h-7 text-[10px] uppercase tracking-wider"
                      >
                        Forcer Sync
                      </Button>
                    </td>
                  </tr>
                ))}
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
                    <td className="text-muted-foreground">{ROLE_LABEL[u.role]}</td>
                    <td className="text-muted-foreground text-xs">{u.email}</td>
                    <td>
                      <button
                        onClick={() => toggleActive(u.id)}
                        className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-wider ${u.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}
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
                      className={`text-[10px] font-mono uppercase ${s.online ? "text-success" : "text-destructive"}`}
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
  onSave,
  onCancel,
}: {
  initial?: Partial<User>;
  onSave: (u: Omit<User, "id">) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [role, setRole] = useState<Role>(initial?.role ?? "resp_production");
  const [active, setActive] = useState<boolean>(initial?.active ?? true);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="text-sm uppercase tracking-wider font-mono">
          {initial?.name ? "Modifier utilisateur" : "Ajouter utilisateur"}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-3 py-2">
        <div>
          <Label className="text-[10px] font-mono uppercase tracking-wider">Nom complet</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="font-mono" />
        </div>
        <div>
          <Label className="text-[10px] font-mono uppercase tracking-wider">Email</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="font-mono"
          />
        </div>
        <div>
          <Label className="text-[10px] font-mono uppercase tracking-wider">Rôle</Label>
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger className="font-mono">
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
        <div className="flex items-center gap-2">
          <Switch checked={active} onCheckedChange={setActive} />
          <span className="text-xs font-mono uppercase tracking-wider">Compte actif</span>
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          onClick={() => {
            if (!name || !email) return;
            onSave({ name, email, role, active });
          }}
        >
          Enregistrer
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
