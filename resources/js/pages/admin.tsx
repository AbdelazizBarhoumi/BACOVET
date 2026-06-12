import { Head } from "@inertiajs/react";
import { Pencil, Plus, Monitor, Trash2, AlertTriangle } from "lucide-react";
import { useEffect, useState, useRef, useReducer, useCallback } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Panel } from "@/components/widgets";
import { ROLE_LABEL, type Role, useAuth } from "@/context/AuthContext";
import { useLiveData } from "@/hooks/use-live-data";
import {
  getAudit,
  isAuditEnabled,
  pushAudit,
  setAuditEnabled,
  clearAudit,
  type AuditEntry,
} from "@/lib/audit";
import { 
    fetchAllJobs, 
    runJobManually, 
    fetchAllUsers, 
    createUser, 
    updateUser, 
    toggleUserStatus, 
    fetchAllScreens, 
    updateScreen 
} from "@/services/adminApi";

type User = {
  id: number;
  name: string;
  matricule: string;
  role: {
    slug: Role;
    name: string;
  };
  email: string;
  is_active: boolean;
};

type JobApi = {
    id: number;
    name: string;
    query_slug?: string;
    last_status: string;
    last_run_at: string;
    is_active: boolean;
};

type Screen = { 
    id: number;
    name: string; 
    status: "online" | "offline"; 
    assigned_page: string 
};

type AdminState = {
    jobs: {
      id: number;
      name: string;
      description?: string;
      last_status: string;
      last_run: string;
      active: boolean;
    }[];
    users: User[];
    screens: Screen[];
    error: string | null;
};

type AdminAction = {
    type: 'LOAD_DATA';
    payload: {
        jobs: JobApi[];
        users: User[];
        screens: Screen[];
    };
} | {
    type: 'SET_ERROR';
    payload: string;
} | {
    type: 'UPDATE_JOBS';
    payload: AdminState['jobs'];
} | {
    type: 'UPDATE_USERS';
    payload: User[];
} | {
    type: 'UPDATE_SCREENS';
    payload: Screen[];
};

const adminReducer = (state: AdminState, action: AdminAction): AdminState => {
    switch (action.type) {
        case 'LOAD_DATA': {
            const normalized = (Array.isArray(action.payload.jobs) ? action.payload.jobs : []).map((j: JobApi) => ({
                id: j.id,
                name: j.name || "",
                description: j.query_slug || "",
                last_status: j.last_status,
                last_run: j.last_run_at || "",
                active: !!j.is_active,
            }));
            return { ...state, jobs: normalized, users: action.payload.users, screens: action.payload.screens, error: null };
        }
        case 'SET_ERROR':
            return { ...state, error: action.payload };
        case 'UPDATE_JOBS':
            return { ...state, jobs: action.payload };
        case 'UPDATE_USERS':
            return { ...state, users: action.payload };
        case 'UPDATE_SCREENS':
            return { ...state, screens: action.payload };
        default:
            return state;
    }
};

export default function AdminPage() {
  const { session } = useAuth();
  const { lastSync, now, refreshIntervalSec, setRefreshIntervalSec, forceSync } = useLiveData();

  const [state, dispatch] = useReducer(adminReducer, {
      jobs: [],
      users: [],
      screens: [],
      error: null
  });
  
  const { jobs, users, screens, error } = state;
  
  const [logs, setLogs] = useState<AuditEntry[]>(() => getAudit());
  const [auditOn, setAuditOn] = useState<boolean>(() => isAuditEnabled());
  const [editing, setEditing] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const prevLogCount = useRef<number>(0);

  const loadData = useCallback(async (isMounted: boolean) => {
    try {
      const jobsData = await fetchAllJobs();
      const usersData = await fetchAllUsers();
      const screensData = await fetchAllScreens();

      if (!isMounted) return;

      dispatch({ type: 'LOAD_DATA', payload: { jobs: jobsData, users: usersData, screens: screensData } });
    } catch {
      console.error("Failed to load data");
      if (isMounted) dispatch({ type: 'SET_ERROR', payload: "Impossible de contacter le serveur Novacity API" });
    }
  }, []);

  // ... (keep useEffect and rest of the file)


  // FIX #1: Combined into single useEffect with proper cleanup
  useEffect(() => {
    if (typeof window === "undefined" || !session) return;
    
    let isMounted = true;
    loadData(isMounted);
    
    const refresh = () => setLogs(getAudit());
    window.addEventListener("bacovet-audit", refresh);
    const id = setInterval(refresh, 2000);
    
    return () => {
      isMounted = false;
      window.removeEventListener("bacovet-audit", refresh);
      clearInterval(id);
    };
  }, [session, loadData]); // Removed lastSync here

  // Add a separate effect for periodic sync if needed, but not for initial load
  useEffect(() => {
    if (typeof window === "undefined" || !session) return;
    // Only refresh lighter data or specific parts if needed
  }, [session, lastSync]);

  useEffect(() => {
    if (logEndRef.current && logs.length > prevLogCount.current) {
      // Check if near bottom before auto-scrolling
      const container = logEndRef.current.parentElement;
      if (container) {
          const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
          if (isAtBottom) {
              logEndRef.current.scrollIntoView({ behavior: "smooth" });
          }
      }
    }
    prevLogCount.current = logs.length;
  }, [logs]);

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
    const latestRun = Math.max(...sourceJobs.map((j) => {
        const time = new Date(j.last_run).getTime();
        return isNaN(time) ? 0 : time;
    }), 0);
    
    const isStale = latestRun > 0 && now - latestRun > 120000;

    let status: "ok" | "error" | "stale" = "ok";
    if (error || hasError) status = "error";
    else if (isStale) status = "stale";

    return {
      name: s.name,
      status,
      last:
        latestRun > 0
          ? (() => {
              const diff = now - latestRun;
              const mins = Math.floor(diff / 60000);
              const secs = Math.floor((diff % 60000) / 1000);
              return mins > 0 ? `il y a ${mins} min ${secs}s` : `il y a ${secs}s`;
            })()
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
    if (!session) return;
    try {
      const result = await runJobManually(id);
      toast.success(result?.message || "Job lancé avec succès");
      pushAudit("SYSTEM", `Job lancé manuellement: ID ${id}`);

      // Update job state locally
      dispatch({ 
        type: 'UPDATE_JOBS', 
        payload: jobs.map(j =>
          j.id === Number(id)
            ? { ...j, last_run: result?.data?.ran_at || new Date().toISOString(), last_status: "ok" }
            : j
        ) 
      });
    } catch {
      toast.error("Échec du lancement du job");
      // Optionally reload jobs on error to show accurate status
      loadData(true);
    }
  };

  const deleteUserAction = (_id: number) => {
    toast.error("Suppression non implémentée - Désactivez le compte à la place");
  };

  const toggleActive = async (id: number) => {
    try {
        const result = await toggleUserStatus(id);
        dispatch({ type: 'UPDATE_USERS', payload: users.map(u => u.id === id ? { ...u, is_active: result.is_active } : u) });
        const u = users.find(x => x.id === id);
        if (u) pushAudit("USER", `Utilisateur ${result.is_active ? "activé" : "désactivé"}: ${u.email}`);
        toast.success(result.message);
    } catch {
        toast.error("Échec de la modification du statut");
    }
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
    <>
      <Head title="Administration — BACOVET" />
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
                              if (a.jobs && a.jobs.length > 0) {
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
                <div className="flex items-center gap-2">
                   <Dialog open={creating} onOpenChange={setCreating}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="h-7 text-[10px] uppercase tracking-wider">
                        <Plus className="h-3 w-3 mr-1" /> Ajouter utilisateur
                      </Button>
                    </DialogTrigger>
                    {/* FIX #3: DialogContent must be direct child of Dialog, moved from UserDialog */}
                    <DialogContent>
                      <UserDialog
                        onSave={async (u) => {
                          try {
                              const result = await createUser(u);
                              dispatch({ type: 'UPDATE_USERS', payload: [...users, result.user] });
                              pushAudit("USER", `Utilisateur créé: ${u.email} (${u.role})`);
                              setCreating(false);
                              toast.success("Utilisateur créé");
                          } catch {
                              toast.error("Erreur lors de la création");
                          }

                        }}
                        onCancel={() => setCreating(false)}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
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
                      {/* FIX #4: Safer role display */}
                      <td className="text-muted-foreground">
                        {typeof u.role === 'object' && u.role !== null ? u.role.name : String(u.role || '')}
                      </td>
                      <td className="text-muted-foreground text-xs">{u.email}</td>
                      <td>
                        <button
                          onClick={() => toggleActive(u.id)}
                          className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-wider ${
                            u.is_active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {u.is_active ? "Active" : "Inactive"}
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
                          onClick={() => deleteUserAction(u.id)}
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
              {/* FIX #5: DialogContent moved outside UserDialog */}
              <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
                <DialogContent>
                  {editing && (
                    <UserDialog
                      initial={{
                          ...editing,
                          role: (typeof editing.role === 'object' && editing.role !== null 
                            ? editing.role.slug 
                            : editing.role) as Role,
                          active: editing.is_active
                      }}
                      isEditing={true}
                      onSave={async (u) => {
                        try {
                            const result = await updateUser(editing.id, u);
                            dispatch({ type: 'UPDATE_USERS', payload: users.map((x) => (x.id === editing.id ? result.user : x)) });
                            pushAudit("USER", `Utilisateur modifié: ${u.email}`);
                            setEditing(null);
                            toast.success("Utilisateur mis à jour");
                        } catch {
                            toast.error("Erreur lors de la création");
                        }

                      }}
                      onCancel={() => setEditing(null)}
                    />
                  )}
                </DialogContent>
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
                {screens.map((s) => (
                  <div key={s.id} className="rounded-md border border-border bg-secondary/40 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-bold">{s.name}</span>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                              const nextStatus = s.status === "online" ? "offline" : "online";
                              const result = await updateScreen(s.id, { status: nextStatus });
                              dispatch({ type: 'UPDATE_SCREENS', payload: screens.map(x => x.id === s.id ? result.screen : x) });
                              pushAudit(
                                "SYSTEM",
                                `Écran ${s.name}: ${nextStatus === "online" ? "en ligne" : "hors ligne"}`,
                              );
                              toast.success("Écran mis à jour");
                          } catch {
                              toast.error("Erreur lors de la création");
                          }

                        }}
                        className={`text-[10px] font-mono uppercase ${
                          s.status === "online" ? "text-success" : "text-destructive"
                        }`}
                      >
                        {s.status === "online" ? "En ligne" : "Hors ligne"}
                      </button>
                    </div>
                    <Select
                      value={s.assigned_page ?? ""}
                      onValueChange={async (v) => {
                        try {
                            const result = await updateScreen(s.id, { assigned_page: v });
                            dispatch({ type: 'UPDATE_SCREENS', payload: screens.map(x => x.id === s.id ? result.screen : x) });
                            pushAudit("SYSTEM", `Écran ${s.name} → ${v}`);
                            toast.success("Écran mis à jour");
                        } catch {
                            toast.error("Erreur lors de la création");
                        }

                      }}
                    >
                      <SelectTrigger className="h-7 text-[10px] font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          { label: "Qualité (100)", value: "quality" },
                          { label: "Production / Confection", value: "production_confection" },
                          { label: "Production / Coupe", value: "production_coupe" },
                          { label: "Production / Sérigraphie", value: "production_serigraphie" },
                          { label: "Logistique (300)", value: "logistics" },
                          { label: "Méthodes", value: "methodes" },
                          { label: "Développement (350)", value: "development" },
                          { label: "Admin", value: "admin" },
                        ].map((v) => (
                          <SelectItem key={v.value} value={v.value} className="text-[10px] font-mono">
                            {v.label}
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
                <span className="text-success">{screens.filter((s) => s.status === "online").length}</span>
              </div>
            </Panel>
          </div>
        </div>
      </AppShell>
    </>
  );
}

// FIX #6: UserDialog no longer includes DialogContent - it's rendered inside Dialog by parent
type UserDialogProps = {
  initial?: Partial<Omit<User, 'role'> & { active?: boolean; role?: Role }>;
  isEditing?: boolean;
  onSave: (u: Record<string, unknown>) => void;
  onCancel: () => void;
};

function UserDialog({
  initial,
  isEditing,
  onSave,
  onCancel,
}: UserDialogProps) {
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
    onSave({ 
        name, 
        matricule, 
        email, 
        role, 
        active, 
        password: password || undefined 
    });
  };

  return (
    <>
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

        <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 mt-1">
            <div>
              <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                {isEditing ? "Nouveau mot de passe" : "Mot de passe"}
              </Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="font-mono h-9"
              />
            </div>
            {!isEditing && (
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
            )}
        </div>

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
    </>
  );
}