import { Head } from '@inertiajs/react';
import { Pencil, Plus, Monitor, Trash2, AlertTriangle } from 'lucide-react';
import { useEffect, useState, useRef, useReducer, useCallback } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Panel } from '@/components/widgets';
import { ROLE_LABEL, type Role, useAuth } from '@/context/AuthContext';
import { useLiveData } from '@/hooks/use-live-data';
import {
    fetchAllJobs,
    runJobManually,
    fetchAllUsers,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    fetchAllScreens,
    createScreen,
    updateScreen,
    deleteScreen,
    fetchSyncConfig,
    updateSyncConfig,
    fetchAuditLogs,
    createAuditLog,
    clearAuditLogs,
    fetchManualKpiValues,
    updateManualKpiValue,
    fetchPipelineStatus,
    triggerSourceSync,
    triggerAllSync,
    type SyncConfigItem,
    type AuditLogEntry,
    type ManualKpiEntry,
    type PipelineStatus,
} from '@/services/adminApi';

function Skeleton({ className = '' }: { className?: string }) {
    return <div className={`animate-pulse rounded bg-muted ${className}`} />;
}

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
    status: 'online' | 'offline';
    assigned_page: string;
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

type AdminAction =
    | {
          type: 'LOAD_DATA';
          payload: {
              jobs: JobApi[];
              users: User[];
              screens: Screen[];
          };
      }
    | {
          type: 'SET_ERROR';
          payload: string;
      }
    | {
          type: 'UPDATE_JOBS';
          payload: AdminState['jobs'];
      }
    | {
          type: 'UPDATE_USERS';
          payload: User[];
      }
    | {
          type: 'UPDATE_SCREENS';
          payload: Screen[];
      };

const adminReducer = (state: AdminState, action: AdminAction): AdminState => {
    switch (action.type) {
        case 'LOAD_DATA': {
            const normalized = (
                Array.isArray(action.payload.jobs) ? action.payload.jobs : []
            ).map((j: JobApi) => ({
                id: j.id,
                name: j.name || '',
                description: j.query_slug || '',
                last_status: j.last_status,
                last_run: j.last_run_at || '',
                active: !!j.is_active,
            }));
            return {
                ...state,
                jobs: normalized,
                users: action.payload.users,
                screens: action.payload.screens,
                error: null,
            };
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
    const {
        lastSync,
        now,
        refreshIntervalSec,
        setRefreshIntervalSec,
        forceSync,
    } = useLiveData();

    const [state, dispatch] = useReducer(adminReducer, {
        jobs: [],
        users: [],
        screens: [],
        error: null,
    });

    const { jobs, users, screens, error } = state;

    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<User | null>(null);
    const [creating, setCreating] = useState(false);
    const [deleting, setDeleting] = useState<User | null>(null);
    const [creatingScreen, setCreatingScreen] = useState(false);
    const [deletingScreen, setDeletingScreen] = useState<Screen | null>(null);
    const [screenName, setScreenName] = useState('');
    const [syncConfig, setSyncConfig] = useState<SyncConfigItem[]>([]);
    const [kpiValues, setKpiValues] = useState<ManualKpiEntry[]>([]);
    const [editingKpi, setEditingKpi] = useState<ManualKpiEntry | null>(null);
    const [kpiNumerator, setKpiNumerator] = useState('');
    const [kpiDenominator, setKpiDenominator] = useState('');
    const logEndRef = useRef<HTMLDivElement>(null);
    const prevLogCount = useRef<number>(0);

    const loadData = useCallback(async (isMounted: boolean) => {
        setLoading(true);
        try {
            const [jobsData, usersData, screensData, auditData] =
                await Promise.all([
                    fetchAllJobs(),
                    fetchAllUsers(),
                    fetchAllScreens(),
                    fetchAuditLogs().catch(() => []),
                ]);

            if (!isMounted) return;

            dispatch({
                type: 'LOAD_DATA',
                payload: {
                    jobs: jobsData,
                    users: usersData,
                    screens: screensData,
                },
            });
            setLogs(auditData);
            setLoading(false);

            try {
                const config = await fetchSyncConfig();
                if (isMounted) setSyncConfig(config);
            } catch {
                // Sync config fetch is optional — non-critical
            }

            try {
                const kpis = await fetchManualKpiValues();
                if (isMounted) setKpiValues(kpis);
            } catch {
                // KPI values fetch is optional
            }
        } catch {
            console.error('Failed to load data');
            if (isMounted) {
                dispatch({
                    type: 'SET_ERROR',
                    payload: 'Impossible de contacter le serveur Novacity API',
                });
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined' || !session) return;

        let isMounted = true;
        setTimeout(() => {
            loadData(isMounted);
        }, 0);

        const refreshLogs = async () => {
            try {
                const data = await fetchAuditLogs();
                if (isMounted) setLogs(data);
            } catch {
                // Non-critical — keep existing logs
            }
        };
        const id = setInterval(refreshLogs, 10000);

        return () => {
            isMounted = false;
            clearInterval(id);
        };
    }, [session, loadData]);

    useEffect(() => {
        if (logEndRef.current && logs.length > prevLogCount.current) {
            const container = logEndRef.current.parentElement;
            if (container) {
                const isAtBottom =
                    container.scrollHeight - container.scrollTop <=
                    container.clientHeight + 100;
                if (isAtBottom) {
                    logEndRef.current.scrollIntoView({ behavior: 'smooth' });
                }
            }
        }
        prevLogCount.current = logs.length;
    }, [logs]);

    const sources = [
        { name: 'ERP DIVA', match: /DIVA|Stock/i },
        { name: 'GPRO-PROD', match: /GPRO|Prod|Chaine|Efficience/i },
        { name: 'Google Drive', match: /Drive|Spreadsheet/i },
    ];

    const apiStatus = sources.map((s) => {
        const sourceJobs = jobs.filter(
            (j) =>
                s.match.test(j.name || '') || s.match.test(j.description || ''),
        );
        const hasError = sourceJobs.some((j) => j.last_status !== 'ok');
        const latestRun = Math.max(
            ...sourceJobs.map((j) => {
                const time = new Date(j.last_run).getTime();
                return isNaN(time) ? 0 : time;
            }),
            0,
        );

        const isStale = latestRun > 0 && now - latestRun > 120000;

        let status: 'ok' | 'error' | 'stale' = 'ok';
        if (error || hasError) status = 'error';
        else if (isStale) status = 'stale';

        return {
            name: s.name,
            status,
            last:
                latestRun > 0
                    ? (() => {
                          const diff = now - latestRun;
                          const mins = Math.floor(diff / 60000);
                          const secs = Math.floor((diff % 60000) / 1000);
                          return mins > 0
                              ? `il y a ${mins} min ${secs}s`
                              : `il y a ${secs}s`;
                      })()
                    : error
                      ? 'Erreur'
                      : 'Jamais',
            jobs: sourceJobs,
        };
    });

    const inactiveBundlingIds = [60, 61, 54, 55];
    const bundlingInactive =
        jobs.length > 0 &&
        jobs.some(
            (j) =>
                inactiveBundlingIds.includes(Number(j.id)) &&
                j.active === false,
        );

    const handleRunJob = async (id: number | string) => {
        if (!session) return;
        try {
            const result = await runJobManually(id);
            toast.success(result?.message || 'Job lancé avec succès');
            createAuditLog('SYSTEM', `Job lancé manuellement: ID ${id}`).catch(
                () => {},
            );

            // Update job state locally
            dispatch({
                type: 'UPDATE_JOBS',
                payload: jobs.map((j) =>
                    j.id === Number(id)
                        ? {
                              ...j,
                              last_run:
                                  result?.data?.ran_at ||
                                  new Date().toISOString(),
                              last_status: 'ok',
                          }
                        : j,
                ),
            });
        } catch {
            toast.error('Échec du lancement du job');
            // Optionally reload jobs on error to show accurate status
            loadData(true);
        }
    };

    const deleteUserAction = async () => {
        if (!deleting) return;
        try {
            await deleteUser(deleting.id);
            dispatch({
                type: 'UPDATE_USERS',
                payload: users.filter((u) => u.id !== deleting.id),
            });
            createAuditLog(
                'USER',
                `Utilisateur supprimé: ${deleting.name} (${deleting.email})`,
            ).catch(() => {});
            setDeleting(null);
            toast.success('Utilisateur supprimé');
        } catch {
            toast.error('Erreur lors de la suppression');
        }
    };

    const toggleActive = async (id: number) => {
        try {
            const result = await toggleUserStatus(id);
            dispatch({
                type: 'UPDATE_USERS',
                payload: users.map((u) =>
                    u.id === id ? { ...u, is_active: result.is_active } : u,
                ),
            });
            const u = users.find((x) => x.id === id);
            if (u)
                createAuditLog(
                    'USER',
                    `Utilisateur ${result.is_active ? 'activé' : 'désactivé'}: ${u.email}`,
                ).catch(() => {});
            toast.success(result.message);
        } catch {
            toast.error('Échec de la modification du statut');
        }
    };

    const statusMeta = (status: 'ok' | 'error' | 'stale') => {
        switch (status) {
            case 'ok':
                return {
                    dot: 'bg-success',
                    text: 'text-success',
                    label: '200 OK',
                };
            case 'error':
                return {
                    dot: 'bg-destructive',
                    text: 'text-destructive',
                    label: 'ERREUR',
                };
            case 'stale':
                return {
                    dot: 'bg-warning',
                    text: 'text-warning',
                    label: 'STALE',
                };
        }
    };

    return (
        <>
            <Head title="Administration — BACOVET" />
            <AppShell
                page="/admin"
                title="Administration"
                subtitle="Panneau de contrôle système"
            >
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                    <div className="space-y-3 lg:col-span-2">
                        {error && (
                            <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-destructive">
                                <AlertTriangle className="h-5 w-5" />
                                <div className="text-xs font-bold uppercase">
                                    {error}
                                </div>
                            </div>
                        )}

                        {bundlingInactive && (
                            <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-destructive">
                                <AlertTriangle className="h-5 w-5" />
                                <div className="text-xs">
                                    <p className="font-bold uppercase">
                                        Attention : 4 requêtes BR Bundling sont
                                        inactives.
                                    </p>
                                    <p>
                                        Contactez Novacity pour activation
                                        (Blocker B-01).
                                    </p>
                                </div>
                            </div>
                        )}

                        <Panel title="Configuration globale">
                            <div className="flex flex-wrap items-end gap-4">
                                <div>
                                    <Label className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                        Fréquence de rafraîchissement (secondes)
                                    </Label>
                                    <Input
                                        type="number"
                                        min={10}
                                        max={600}
                                        value={refreshIntervalSec}
                                        onChange={(e) =>
                                            setRefreshIntervalSec(
                                                Math.max(
                                                    10,
                                                    Math.min(
                                                        600,
                                                        Number(
                                                            e.target.value,
                                                        ) || 60,
                                                    ),
                                                ),
                                            )
                                        }
                                        className="w-32 font-mono"
                                    />
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        forceSync();
                                        createAuditLog(
                                            'SYSTEM',
                                            'Sync globale forcée',
                                        ).catch(() => {});
                                    }}
                                >
                                    Forcer la synchronisation
                                </Button>
                                <div className="ml-auto font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                    Dernière sync:{' '}
                                    <span className="text-foreground">
                                        {lastSync
                                            ? new Date(
                                                  lastSync,
                                              ).toLocaleTimeString()
                                            : '—'}
                                    </span>
                                </div>
                            </div>
                        </Panel>

                        {syncConfig.length > 0 && (
                            <Panel title="Configuration Sync Backend">
                                <div className="space-y-3">
                                    <p className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                        Intervalles de synchronisation Novacity
                                        → MySQL (min: 60s, max: 3600s)
                                    </p>
                                    {syncConfig.map((item) => (
                                        <div
                                            key={item.key}
                                            className="flex items-center gap-4"
                                        >
                                            <div className="flex-1">
                                                <Label className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                                    {item.description ||
                                                        item.key}
                                                </Label>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    min={60}
                                                    max={3600}
                                                    value={item.value}
                                                    onChange={(e) => {
                                                        const newVal = Math.max(
                                                            60,
                                                            Math.min(
                                                                3600,
                                                                Number(
                                                                    e.target
                                                                        .value,
                                                                ) || 60,
                                                            ),
                                                        );
                                                        setSyncConfig((prev) =>
                                                            prev.map((c) =>
                                                                c.key ===
                                                                item.key
                                                                    ? {
                                                                          ...c,
                                                                          value: String(
                                                                              newVal,
                                                                          ),
                                                                      }
                                                                    : c,
                                                            ),
                                                        );
                                                    }}
                                                    className="h-7 w-24 font-mono text-xs"
                                                />
                                                <span className="font-mono text-[10px] text-muted-foreground">
                                                    sec
                                                </span>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 text-[10px] tracking-wider uppercase"
                                                    onClick={async () => {
                                                        try {
                                                            await updateSyncConfig(
                                                                item.key,
                                                                Number(
                                                                    item.value,
                                                                ),
                                                            );
                                                            toast.success(
                                                                `${item.description || item.key} mis à jour`,
                                                            );
                                                            createAuditLog(
                                                                'SYSTEM',
                                                                `Intervalle sync mis à jour: ${item.key} = ${item.value}s`,
                                                            ).catch(() => {});
                                                        } catch {
                                                            toast.error(
                                                                'Erreur lors de la mise à jour',
                                                            );
                                                        }
                                                    }}
                                                >
                                                    Sauver
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Panel>
                        )}

                        <Panel title="Gestion des KPI Manuels">
                            <p className="mb-3 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                Valeurs KPI saisies manuellement (Méthodes + Développement)
                            </p>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                        <th className="py-2 text-left">Clé</th>
                                        <th className="text-left">Indicateur</th>
                                        <th className="text-right">Valeur</th>
                                        <th className="text-right">Dernière MAJ</th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="font-mono">
                                    {kpiValues.map((kpi) => (
                                        <tr key={kpi.kpi_key} className="border-b border-border/50">
                                            <td className="py-2 text-primary text-xs">{kpi.kpi_key}</td>
                                            <td className="text-xs">{kpi.kpi_label}</td>
                                            <td className="text-right text-xs tabular-nums">
                                                {kpi.value !== null ? `${kpi.value}%` : '—'}
                                            </td>
                                            <td className="text-right text-[10px] text-muted-foreground">
                                                {kpi.updated_at
                                                    ? new Date(kpi.updated_at).toLocaleString('fr-FR')
                                                    : '—'}
                                                {kpi.updated_by && (
                                                    <span className="ml-1">({kpi.updated_by})</span>
                                                )}
                                            </td>
                                            <td className="text-right">
                                                <button
                                                    onClick={() => {
                                                        setEditingKpi(kpi);
                                                        setKpiNumerator(kpi.numerator?.toString() ?? '');
                                                        setKpiDenominator(kpi.denominator?.toString() ?? '');
                                                    }}
                                                    className="rounded border border-border px-2 py-1 text-[10px] text-primary hover:bg-accent"
                                                >
                                                    <Pencil className="inline h-3 w-3" /> Modifier
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {kpiValues.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-4 text-center text-xs text-muted-foreground">
                                                Aucune valeur KPI enregistrée
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </Panel>

                        {/* KPI Edit Modal */}
                        <Dialog open={!!editingKpi} onOpenChange={(open) => { if (!open) setEditingKpi(null); }}>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="text-sm font-bold tracking-wider uppercase">
                                        Modifier — {editingKpi?.kpi_label}
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div>
                                        <Label className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                            Numérateur (valeur actuelle)
                                        </Label>
                                        <Input
                                            type="number"
                                            value={kpiNumerator}
                                            onChange={(e) => setKpiNumerator(e.target.value)}
                                            className="font-mono text-sm"
                                        />
                                    </div>
                                    <div>
                                        <Label className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                            Dénominateur (total)
                                        </Label>
                                        <Input
                                            type="number"
                                            value={kpiDenominator}
                                            onChange={(e) => setKpiDenominator(e.target.value)}
                                            className="font-mono text-sm"
                                        />
                                    </div>
                                    {kpiNumerator && kpiDenominator && parseFloat(kpiDenominator) > 0 && (
                                        <div className="rounded border border-border bg-secondary/50 px-3 py-2 text-center">
                                            <div className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">Résultat</div>
                                            <div className="font-mono text-2xl font-bold tabular-nums">
                                                {((parseFloat(kpiNumerator) / parseFloat(kpiDenominator)) * 100).toFixed(1)}%
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <DialogFooter className="gap-2">
                                    <Button variant="ghost" onClick={() => setEditingKpi(null)} className="text-[10px] tracking-wider uppercase">
                                        Annuler
                                    </Button>
                                    <Button
                                        onClick={async () => {
                                            if (!editingKpi || !kpiNumerator || !kpiDenominator) return;
                                            try {
                                                await updateManualKpiValue(
                                                    editingKpi.kpi_key,
                                                    parseFloat(kpiNumerator),
                                                    parseFloat(kpiDenominator),
                                                );
                                                toast.success(`KPI ${editingKpi.kpi_key} mis à jour`);
                                                setEditingKpi(null);
                                                const kpis = await fetchManualKpiValues();
                                                setKpiValues(kpis);
                                            } catch {
                                                toast.error('Erreur lors de la mise à jour');
                                            }
                                        }}
                                        className="px-6 text-[10px] tracking-wider uppercase"
                                    >
                                        Enregistrer
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <Panel title="Supervision des flux API">
                            {loading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map((i) => (
                                        <div
                                            key={i}
                                            className="flex items-center gap-4 py-2"
                                        >
                                            <Skeleton className="h-4 w-28" />
                                            <Skeleton className="h-4 w-16" />
                                            <Skeleton className="h-4 w-24" />
                                            <div className="ml-auto">
                                                <Skeleton className="h-7 w-28" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                            <th className="py-2 text-left">
                                                Source
                                            </th>
                                            <th className="text-left">
                                                Statut
                                            </th>
                                            <th className="text-left">
                                                Dernière sync
                                            </th>
                                            <th className="text-right">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="font-mono">
                                        {apiStatus.map((a) => {
                                            const meta = statusMeta(a.status);
                                            return (
                                                <tr
                                                    key={a.name}
                                                    className="border-b border-border/50"
                                                >
                                                    <td className="py-2 font-bold">
                                                        {a.name}
                                                    </td>
                                                    <td>
                                                        <span className="inline-flex items-center gap-2 text-xs">
                                                            <span
                                                                className={`h-2 w-2 rounded-full ${meta.dot} ${
                                                                    a.status ===
                                                                    'ok'
                                                                        ? 'animate-pulse'
                                                                        : ''
                                                                }`}
                                                            />
                                                            <span
                                                                className={
                                                                    meta.text
                                                                }
                                                            >
                                                                {meta.label}
                                                            </span>
                                                        </span>
                                                    </td>
                                                    <td className="text-xs text-muted-foreground">
                                                        {a.last}
                                                    </td>
                                                    <td className="text-right">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                if (
                                                                    a.jobs &&
                                                                    a.jobs
                                                                        .length >
                                                                        0
                                                                ) {
                                                                    handleRunJob(
                                                                        a
                                                                            .jobs[0]
                                                                            .id,
                                                                    );
                                                                } else {
                                                                    forceSync();
                                                                    createAuditLog(
                                                                        'SYSTEM',
                                                                        `Sync globale forcée via ${a.name}`,
                                                                    ).catch(
                                                                        () => {},
                                                                    );
                                                                }
                                                            }}
                                                            className="h-7 text-[10px] tracking-wider uppercase"
                                                        >
                                                            Exécuter Maintenant
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </Panel>

                        <Panel
                            title="Gestion des comptes"
                            right={
                                <div className="flex items-center gap-2">
                                    <Dialog
                                        open={creating}
                                        onOpenChange={setCreating}
                                    >
                                        <DialogTrigger asChild>
                                            <Button
                                                size="sm"
                                                className="h-7 text-[10px] tracking-wider uppercase"
                                            >
                                                <Plus className="mr-1 h-3 w-3" />{' '}
                                                Ajouter utilisateur
                                            </Button>
                                        </DialogTrigger>
                                        {/* FIX #3: DialogContent must be direct child of Dialog, moved from UserDialog */}
                                        <DialogContent>
                                            <UserDialog
                                                onSave={async (u) => {
                                                    try {
                                                        const result =
                                                            await createUser(u);
                                                        dispatch({
                                                            type: 'UPDATE_USERS',
                                                            payload: [
                                                                ...users,
                                                                result.user,
                                                            ],
                                                        });
                                                        createAuditLog(
                                                            'USER',
                                                            `Utilisateur créé: ${u.email} (${u.role})`,
                                                        ).catch(() => {});
                                                        setCreating(false);
                                                        toast.success(
                                                            'Utilisateur créé',
                                                        );
                                                    } catch {
                                                        toast.error(
                                                            'Erreur lors de la création',
                                                        );
                                                    }
                                                }}
                                                onCancel={() =>
                                                    setCreating(false)
                                                }
                                            />
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            }
                        >
                            {loading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div
                                            key={i}
                                            className="flex items-center gap-4 py-2"
                                        >
                                            <Skeleton className="h-7 w-7 rounded-full" />
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-4 w-16" />
                                            <Skeleton className="h-4 w-20" />
                                            <Skeleton className="h-4 w-36" />
                                            <Skeleton className="h-5 w-14" />
                                            <div className="ml-auto flex gap-1">
                                                <Skeleton className="h-7 w-7" />
                                                <Skeleton className="h-7 w-7" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                            <th className="py-2 text-left">
                                                Utilisateur
                                            </th>
                                            <th className="text-left">
                                                Matricule
                                            </th>
                                            <th className="text-left">Rôle</th>
                                            <th className="text-left">Email</th>
                                            <th className="text-left">
                                                Statut
                                            </th>
                                            <th className="text-right">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="font-mono">
                                        {users.map((u) => (
                                            <tr
                                                key={u.id}
                                                className="border-b border-border/50"
                                            >
                                                <td className="py-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="grid h-7 w-7 place-items-center rounded-full bg-secondary text-[10px] font-bold">
                                                            {u.name
                                                                .split(' ')
                                                                .map(
                                                                    (s) => s[0],
                                                                )
                                                                .join('')
                                                                .slice(0, 2)}
                                                        </div>
                                                        {u.name}
                                                    </div>
                                                </td>
                                                <td className="text-xs text-muted-foreground uppercase">
                                                    {u.matricule || '—'}
                                                </td>
                                                {/* FIX #4: Safer role display */}
                                                <td className="text-muted-foreground">
                                                    {typeof u.role ===
                                                        'object' &&
                                                    u.role !== null
                                                        ? u.role.name
                                                        : String(u.role || '')}
                                                </td>
                                                <td className="text-xs text-muted-foreground">
                                                    {u.email}
                                                </td>
                                                <td>
                                                    <button
                                                        onClick={() =>
                                                            toggleActive(u.id)
                                                        }
                                                        className={`rounded px-2 py-0.5 text-[10px] tracking-wider uppercase ${
                                                            u.is_active
                                                                ? 'bg-success/15 text-success'
                                                                : 'bg-muted text-muted-foreground'
                                                        }`}
                                                    >
                                                        {u.is_active
                                                            ? 'Active'
                                                            : 'Inactive'}
                                                    </button>
                                                </td>
                                                <td className="text-right">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 w-7 p-0"
                                                        onClick={() =>
                                                            setEditing(u)
                                                        }
                                                    >
                                                        <Pencil className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 w-7 p-0 text-destructive"
                                                        onClick={() =>
                                                            setDeleting(u)
                                                        }
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                            <div className="mt-3 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                Total utilisateurs :{' '}
                                <span className="text-foreground">
                                    {users.length}
                                </span>
                            </div>
                            {/* FIX #5: DialogContent moved outside UserDialog */}
                            <Dialog
                                open={!!editing}
                                onOpenChange={(o) => !o && setEditing(null)}
                            >
                                <DialogContent>
                                    {editing && (
                                        <UserDialog
                                            initial={{
                                                ...editing,
                                                role: (typeof editing.role ===
                                                    'object' &&
                                                editing.role !== null
                                                    ? editing.role.slug
                                                    : editing.role) as Role,
                                                active: editing.is_active,
                                            }}
                                            isEditing={true}
                                            onSave={async (u) => {
                                                try {
                                                    const result =
                                                        await updateUser(
                                                            editing.id,
                                                            u,
                                                        );
                                                    dispatch({
                                                        type: 'UPDATE_USERS',
                                                        payload: users.map(
                                                            (x) =>
                                                                x.id ===
                                                                editing.id
                                                                    ? result.user
                                                                    : x,
                                                        ),
                                                    });
                                                    createAuditLog(
                                                        'USER',
                                                        `Utilisateur modifié: ${u.email}`,
                                                    ).catch(() => {});
                                                    setEditing(null);
                                                    toast.success(
                                                        'Utilisateur mis à jour',
                                                    );
                                                } catch {
                                                    toast.error(
                                                        'Erreur lors de la création',
                                                    );
                                                }
                                            }}
                                            onCancel={() => setEditing(null)}
                                        />
                                    )}
                                </DialogContent>
                            </Dialog>

                            <Dialog
                                open={!!deleting}
                                onOpenChange={(o) => !o && setDeleting(null)}
                            >
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle className="flex items-center gap-2 font-mono text-sm tracking-wider text-destructive uppercase">
                                            <Trash2 className="h-4 w-4" />
                                            Supprimer l'utilisateur
                                        </DialogTitle>
                                    </DialogHeader>
                                    <div className="py-2">
                                        <p className="text-sm text-muted-foreground">
                                            Voulez-vous vraiment supprimer
                                            l'utilisateur{' '}
                                            <span className="font-bold text-foreground">
                                                {deleting?.name}
                                            </span>{' '}
                                            ?
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Cette action est irréversible.
                                            L'utilisateur ne pourra plus se
                                            connecter.
                                        </p>
                                    </div>
                                    <DialogFooter className="gap-2">
                                        <Button
                                            variant="ghost"
                                            onClick={() => setDeleting(null)}
                                            className="text-[10px] tracking-wider uppercase"
                                        >
                                            Annuler
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            onClick={deleteUserAction}
                                            className="px-6 text-[10px] tracking-wider uppercase"
                                        >
                                            Supprimer
                                        </Button>
                                    </DialogFooter>
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
                                        onClick={async () => {
                                            if (
                                                confirm(
                                                    'Effacer tous les logs ?',
                                                )
                                            ) {
                                                try {
                                                    await clearAuditLogs();
                                                    setLogs([]);
                                                    createAuditLog(
                                                        'SYSTEM',
                                                        "Journal d'audit effacé par l'administrateur",
                                                    ).catch(() => {});
                                                    toast.success(
                                                        'Logs effacés',
                                                    );
                                                } catch {
                                                    toast.error(
                                                        'Erreur lors de la suppression',
                                                    );
                                                }
                                            }
                                        }}
                                        className="h-7 text-[10px] tracking-wider text-destructive uppercase"
                                    >
                                        <Trash2 className="mr-1 h-3 w-3" />{' '}
                                        Effacer les logs
                                    </Button>
                                    <div className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                        Enregistrement serveur actif
                                    </div>
                                </div>
                            }
                        >
                            <div className="max-h-80 space-y-1 overflow-auto font-mono text-xs">
                                {loading ? (
                                    <div className="space-y-2">
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <div
                                                key={i}
                                                className="flex gap-2 py-1"
                                            >
                                                <Skeleton className="h-3 w-16" />
                                                <Skeleton className="h-3 w-14" />
                                                <Skeleton className="h-3 w-48" />
                                            </div>
                                        ))}
                                    </div>
                                ) : logs.length === 0 ? (
                                    <div className="text-muted-foreground italic">
                                        Aucun événement enregistré.
                                    </div>
                                ) : (
                                    logs.map((l, i) => {
                                        const color =
                                            l.action_type === 'ERROR'
                                                ? 'text-destructive'
                                                : l.action_type === 'WARN'
                                                  ? 'text-warning'
                                                  : l.action_type === 'USER'
                                                    ? 'text-chart-4'
                                                    : l.action_type === 'SYSTEM'
                                                      ? 'text-primary'
                                                      : 'text-success';
                                        const time = l.created_at
                                            ? new Date(
                                                  l.created_at,
                                              ).toLocaleTimeString()
                                            : '';
                                        return (
                                            <div
                                                key={i}
                                                className="flex gap-2 border-b border-border/30 py-1"
                                            >
                                                <span className="text-muted-foreground">
                                                    [{time}]
                                                </span>
                                                <span
                                                    className={`${color} w-16 font-bold`}
                                                >
                                                    [{l.action_type}]
                                                </span>
                                                <span className="text-foreground/90">
                                                    {l.message}
                                                </span>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={logEndRef} />
                            </div>
                        </Panel>
                    </div>

                    <div className="space-y-3">
                        <Panel
                            title="Écrans TV"
                            right={
                                <Button
                                    size="sm"
                                    className="h-7 text-[10px] tracking-wider uppercase"
                                    onClick={() => {
                                        setScreenName('');
                                        setCreatingScreen(true);
                                    }}
                                >
                                    <Plus className="mr-1 h-3 w-3" /> Ajouter
                                    écran
                                </Button>
                            }
                        >
                            <div className="space-y-2">
                                {loading
                                    ? [1, 2, 3].map((i) => (
                                          <div
                                              key={i}
                                              className="rounded-md border border-border bg-secondary/40 p-3"
                                          >
                                              <div className="mb-2 flex items-center justify-between">
                                                  <div className="flex items-center gap-2">
                                                      <Skeleton className="h-3.5 w-3.5 rounded" />
                                                      <Skeleton className="h-4 w-24" />
                                                  </div>
                                                  <Skeleton className="h-4 w-16" />
                                              </div>
                                              <Skeleton className="h-7 w-full" />
                                          </div>
                                      ))
                                    : screens.map((s) => (
                                          <div
                                              key={s.id}
                                              className="rounded-md border border-border bg-secondary/40 p-3"
                                          >
                                              <div className="mb-2 flex items-center justify-between">
                                                  <div className="flex items-center gap-2">
                                                      <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
                                                      <span className="text-sm font-bold">
                                                          {s.name}
                                                      </span>
                                                  </div>
                                                  <div className="flex items-center gap-1">
                                                      <button
                                                          onClick={async () => {
                                                              try {
                                                                  const nextStatus =
                                                                      s.status ===
                                                                      'online'
                                                                          ? 'offline'
                                                                          : 'online';
                                                                  const result =
                                                                      await updateScreen(
                                                                          s.id,
                                                                          {
                                                                              status: nextStatus,
                                                                          },
                                                                      );
                                                                  dispatch({
                                                                      type: 'UPDATE_SCREENS',
                                                                      payload:
                                                                          screens.map(
                                                                              (
                                                                                  x,
                                                                              ) =>
                                                                                  x.id ===
                                                                                  s.id
                                                                                      ? result.screen
                                                                                      : x,
                                                                          ),
                                                                  });
                                                                  createAuditLog(
                                                                      'SYSTEM',
                                                                      `Écran ${s.name}: ${nextStatus === 'online' ? 'en ligne' : 'hors ligne'}`,
                                                                  ).catch(
                                                                      () => {},
                                                                  );
                                                                  toast.success(
                                                                      'Écran mis à jour',
                                                                  );
                                                              } catch {
                                                                  toast.error(
                                                                      'Erreur lors de la mise à jour',
                                                                  );
                                                              }
                                                          }}
                                                          className={`font-mono text-[10px] uppercase ${
                                                              s.status ===
                                                              'online'
                                                                  ? 'text-success'
                                                                  : 'text-destructive'
                                                          }`}
                                                      >
                                                          {s.status === 'online'
                                                              ? 'En ligne'
                                                              : 'Hors ligne'}
                                                      </button>
                                                      <Button
                                                          size="sm"
                                                          variant="ghost"
                                                          className="h-6 w-6 p-0 text-destructive"
                                                          onClick={() =>
                                                              setDeletingScreen(
                                                                  s,
                                                              )
                                                          }
                                                      >
                                                          <Trash2 className="h-3 w-3" />
                                                      </Button>
                                                  </div>
                                              </div>
                                              <Select
                                                  value={s.assigned_page ?? ''}
                                                  onValueChange={async (v) => {
                                                      try {
                                                          const result =
                                                              await updateScreen(
                                                                  s.id,
                                                                  {
                                                                      assigned_page:
                                                                          v,
                                                                  },
                                                              );
                                                          dispatch({
                                                              type: 'UPDATE_SCREENS',
                                                              payload:
                                                                  screens.map(
                                                                      (x) =>
                                                                          x.id ===
                                                                          s.id
                                                                              ? result.screen
                                                                              : x,
                                                                  ),
                                                          });
                                                          createAuditLog(
                                                              'SYSTEM',
                                                              `Écran ${s.name} → ${v}`,
                                                          ).catch(() => {});
                                                          toast.success(
                                                              'Écran mis à jour',
                                                          );
                                                      } catch {
                                                          toast.error(
                                                              'Erreur lors de la mise à jour',
                                                          );
                                                      }
                                                  }}
                                              >
                                                  <SelectTrigger className="h-7 font-mono text-[10px]">
                                                      <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                      {[
                                                          {
                                                              label: 'Qualité (100)',
                                                              value: 'quality',
                                                          },
                                                          {
                                                              label: 'Production / Confection',
                                                              value: 'production_confection',
                                                          },
                                                          {
                                                              label: 'Production / Coupe',
                                                              value: 'production_coupe',
                                                          },
                                                          {
                                                              label: 'Production / Sérigraphie',
                                                              value: 'production_serigraphie',
                                                          },
                                                          {
                                                              label: 'Logistique (300)',
                                                              value: 'logistics',
                                                          },
                                                          {
                                                              label: 'Méthodes',
                                                              value: 'methodes',
                                                          },
                                                          {
                                                              label: 'Développement (350)',
                                                              value: 'development',
                                                          },
                                                          {
                                                              label: 'Admin',
                                                              value: 'admin',
                                                          },
                                                      ].map((v) => (
                                                          <SelectItem
                                                              key={v.value}
                                                              value={v.value}
                                                              className="font-mono text-[10px]"
                                                          >
                                                              {v.label}
                                                          </SelectItem>
                                                      ))}
                                                  </SelectContent>
                                              </Select>
                                          </div>
                                      ))}
                            </div>
                            <div className="mt-3 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                Total écrans :{' '}
                                <span className="text-foreground">
                                    {screens.length}
                                </span>
                                {' · '}
                                En ligne :{' '}
                                <span className="text-success">
                                    {
                                        screens.filter(
                                            (s) => s.status === 'online',
                                        ).length
                                    }
                                </span>
                            </div>
                        </Panel>

                        <Dialog
                            open={creatingScreen}
                            onOpenChange={setCreatingScreen}
                        >
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2 font-mono text-sm tracking-wider text-primary uppercase">
                                        <Monitor className="h-4 w-4" />
                                        Ajouter un écran
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-3 py-2">
                                    <div>
                                        <Label className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                            Nom de l'écran
                                        </Label>
                                        <Input
                                            value={screenName}
                                            onChange={(e) =>
                                                setScreenName(e.target.value)
                                            }
                                            className="h-9 font-mono"
                                            placeholder="Ex: Écran Qualité 1"
                                        />
                                    </div>
                                </div>
                                <DialogFooter className="gap-2">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setCreatingScreen(false)}
                                        className="text-[10px] tracking-wider uppercase"
                                    >
                                        Annuler
                                    </Button>
                                    <Button
                                        onClick={async () => {
                                            if (!screenName.trim()) {
                                                toast.error(
                                                    'Veuillez entrer un nom',
                                                );
                                                return;
                                            }
                                            try {
                                                const result =
                                                    await createScreen({
                                                        name: screenName.trim(),
                                                    });
                                                dispatch({
                                                    type: 'UPDATE_SCREENS',
                                                    payload: [
                                                        ...screens,
                                                        result.screen,
                                                    ],
                                                });
                                                createAuditLog(
                                                    'SYSTEM',
                                                    `Écran créé: ${screenName.trim()}`,
                                                ).catch(() => {});
                                                setCreatingScreen(false);
                                                toast.success('Écran créé');
                                            } catch {
                                                toast.error(
                                                    'Erreur lors de la création',
                                                );
                                            }
                                        }}
                                        className="px-6 text-[10px] tracking-wider uppercase"
                                    >
                                        Créer
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <Dialog
                            open={!!deletingScreen}
                            onOpenChange={(o) => !o && setDeletingScreen(null)}
                        >
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2 font-mono text-sm tracking-wider text-destructive uppercase">
                                        <Trash2 className="h-4 w-4" />
                                        Supprimer l'écran
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="py-2">
                                    <p className="text-sm text-muted-foreground">
                                        Voulez-vous vraiment supprimer l'écran{' '}
                                        <span className="font-bold text-foreground">
                                            {deletingScreen?.name}
                                        </span>{' '}
                                        ?
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        L'écran sera déconnecté et ne pourra
                                        plus recevoir de pages.
                                    </p>
                                </div>
                                <DialogFooter className="gap-2">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setDeletingScreen(null)}
                                        className="text-[10px] tracking-wider uppercase"
                                    >
                                        Annuler
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={async () => {
                                            if (!deletingScreen) return;
                                            try {
                                                await deleteScreen(
                                                    deletingScreen.id,
                                                );
                                                dispatch({
                                                    type: 'UPDATE_SCREENS',
                                                    payload: screens.filter(
                                                        (s) =>
                                                            s.id !==
                                                            deletingScreen.id,
                                                    ),
                                                });
                                                createAuditLog(
                                                    'SYSTEM',
                                                    `Écran supprimé: ${deletingScreen.name}`,
                                                ).catch(() => {});
                                                setDeletingScreen(null);
                                                toast.success('Écran supprimé');
                                            } catch {
                                                toast.error(
                                                    'Erreur lors de la suppression',
                                                );
                                            }
                                        }}
                                        className="px-6 text-[10px] tracking-wider uppercase"
                                    >
                                        Supprimer
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
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

function UserDialog({ initial, isEditing, onSave, onCancel }: UserDialogProps) {
    const [name, setName] = useState(initial?.name ?? '');
    const [matricule, setMatricule] = useState(initial?.matricule ?? '');
    const [email, setEmail] = useState(initial?.email ?? '');
    const [role, setRole] = useState<Role>(initial?.role ?? 'resp_production');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [active, setActive] = useState<boolean>(initial?.active ?? true);

    const handleSave = () => {
        if (!name || !email || !matricule) {
            toast.error('Veuillez remplir les champs obligatoires');
            return;
        }
        if (!isEditing && password !== confirmPassword) {
            toast.error('Les mots de passe ne correspondent pas');
            return;
        }
        onSave({
            name,
            matricule,
            email,
            role,
            active,
            password: password || undefined,
        });
    };

    return (
        <>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2 font-mono text-sm tracking-wider text-primary uppercase">
                    {isEditing ? (
                        <Pencil className="h-4 w-4" />
                    ) : (
                        <Plus className="h-4 w-4" />
                    )}
                    {isEditing ? 'Modifier utilisateur' : 'Ajouter utilisateur'}
                </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <Label className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                            Nom complet
                        </Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="h-9 font-mono"
                        />
                    </div>
                    <div>
                        <Label className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                            Matricule / EID
                        </Label>
                        <Input
                            value={matricule}
                            onChange={(e) => setMatricule(e.target.value)}
                            className="h-9 font-mono uppercase"
                            placeholder="EID-000"
                        />
                    </div>
                </div>
                <div>
                    <Label className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                        Email professionnel
                    </Label>
                    <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-9 font-mono"
                        placeholder="nom@bacovet.com"
                    />
                </div>
                <div>
                    <Label className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                        Rôle système
                    </Label>
                    <Select
                        value={role}
                        onValueChange={(v) => setRole(v as Role)}
                    >
                        <SelectTrigger className="h-9 font-mono">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                                <SelectItem
                                    key={r}
                                    value={r}
                                    className="font-mono text-xs"
                                >
                                    {ROLE_LABEL[r]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="mt-1 grid grid-cols-2 gap-3 border-t border-border pt-3">
                    <div>
                        <Label className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                            {isEditing
                                ? 'Nouveau mot de passe'
                                : 'Mot de passe'}
                        </Label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-9 font-mono"
                        />
                    </div>
                    {!isEditing && (
                        <div>
                            <Label className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                Confirmer
                            </Label>
                            <Input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) =>
                                    setConfirmPassword(e.target.value)
                                }
                                className="h-9 font-mono"
                            />
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                    <Switch checked={active} onCheckedChange={setActive} />
                    <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                        Compte actif
                    </span>
                </div>
            </div>
            <DialogFooter className="gap-2">
                <Button
                    variant="ghost"
                    onClick={onCancel}
                    className="text-[10px] tracking-wider uppercase"
                >
                    Annuler
                </Button>
                <Button
                    onClick={handleSave}
                    className="px-6 text-[10px] tracking-wider uppercase"
                >
                    {isEditing ? 'Mettre à jour' : 'Créer le compte'}
                </Button>
            </DialogFooter>
        </>
    );
}
