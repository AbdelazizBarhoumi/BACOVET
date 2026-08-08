import { Head } from '@inertiajs/react';
import { useEffect, useState, useRef, useReducer, useCallback } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { EndpointsManager } from '@/components/endpoints/EndpointsManager';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Panel } from '@/components/widgets';
import { ROLE_LABEL, type Role, useAuth } from '@/context/AuthContext';
import { useLiveData } from '@/hooks/use-live-data';
import { exportToCsv } from '@/lib/export';
import {
    fetchAllUsers,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    fetchAuditLogs,
    createAuditLog,
    type AuditLogEntry,
} from '@/services/adminApi';

const ACTION_TYPE_LABELS: Record<string, string> = {
    SYSTEM: 'SYSTÈME',
    USER: 'UTILISATEUR',
    LOGIN: 'CONNEXION',
    LOGOUT: 'DÉCONNEXION',
    LOGIN_FAILED: 'CONNEXION ÉCHOUÉE',
    ERROR: 'ERREUR',
    WARN: 'AVERTISSEMENT',
};

function IconPencil({ className = '' }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
        </svg>
    );
}

function IconPlus({ className = '' }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
        </svg>
    );
}

function IconTrash({ className = '' }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            <line x1="10" x2="10" y1="11" y2="17" />
            <line x1="14" x2="14" y1="11" y2="17" />
        </svg>
    );
}

function IconAlertTriangle({ className = '' }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
        </svg>
    );
}

function IconDownload({ className = '' }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" x2="12" y1="15" y2="3" />
        </svg>
    );
}

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

type AdminState = {
    users: User[];
    error: string | null;
};

type AdminAction =
    | {
          type: 'LOAD_DATA';
          payload: {
              users: User[];
          };
      }
    | {
          type: 'SET_ERROR';
          payload: string;
      }
    | {
          type: 'UPDATE_USERS';
          payload: User[];
      };

const adminReducer = (state: AdminState, action: AdminAction): AdminState => {
    switch (action.type) {
        case 'LOAD_DATA':
            return {
                ...state,
                users: action.payload.users,
                error: null,
            };
        case 'SET_ERROR':
            return { ...state, error: action.payload };
        case 'UPDATE_USERS':
            return { ...state, users: action.payload };
        default:
            return state;
    }
};

export default function AdminPage() {
    const { session } = useAuth();
    const { lastSync, refreshIntervalSec, setRefreshIntervalSec, forceSync } =
        useLiveData();

    const [state, dispatch] = useReducer(adminReducer, {
        users: [],
        error: null,
    });

    const { users, error } = state;

    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<User | null>(null);
    const [creating, setCreating] = useState(false);
    const [deleting, setDeleting] = useState<User | null>(null);
    const logEndRef = useRef<HTMLDivElement>(null);
    const prevLogCount = useRef<number>(0);

    const loadData = useCallback(async (isMounted: boolean) => {
        setLoading(true);
        try {
            const [usersData, auditData] = await Promise.all([
                fetchAllUsers().catch(() => []),
                fetchAuditLogs().catch(() => []),
            ]);

            if (!isMounted) return;

            dispatch({
                type: 'LOAD_DATA',
                payload: {
                    users: usersData,
                },
            });
            setLogs(auditData);
            setLoading(false);
        } catch {
            console.error('Failed to load data');
            if (isMounted) {
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

        const refreshAll = async () => {
            try {
                const auditData = await fetchAuditLogs();
                if (isMounted) {
                    setLogs(auditData);
                }
            } catch {
                // Audit refresh failures are non-fatal; keep polling.
            }
        };
        const id = setInterval(refreshAll, refreshIntervalSec * 1000);

        return () => {
            isMounted = false;
            clearInterval(id);
        };
    }, [session, loadData, refreshIntervalSec]);

    useEffect(() => {
        if (
            logEndRef.current &&
            prevLogCount.current > 0 &&
            logs.length > prevLogCount.current
        ) {
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

    return (
        <>
            <Head title="Administration — BACOVET" />
            <AppShell
                page="/admin"
                title="Administration"
                subtitle="Panneau de contrôle système"
            >
                <div className="space-y-3">
                    <Tabs defaultValue="admin">
                        <TabsList>
                            <TabsTrigger value="admin">
                                Administration
                            </TabsTrigger>
                            <TabsTrigger value="endpoints">
                                Endpoints
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="admin" className="space-y-3">
                            {error && (
                                <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-destructive">
                                    <IconAlertTriangle className="h-5 w-5" />
                                    <div className="text-xs font-bold uppercase">
                                        {error}
                                    </div>
                                </div>
                            )}

                            <Panel title="Configuration globale">
                                <div className="flex flex-wrap items-end gap-4">
                                    <div>
                                        <Label className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                            Fréquence de rafraîchissement
                                            (secondes)
                                        </Label>
                                        <Input
                                            type="number"
                                            min={60}
                                            max={600}
                                            value={refreshIntervalSec}
                                            onChange={(e) =>
                                                setRefreshIntervalSec(
                                                    Math.max(
                                                        60,
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
                                                    <IconPlus className="mr-1 h-3 w-3" />{' '}
                                                    Ajouter utilisateur
                                                </Button>
                                            </DialogTrigger>
                                            {/* FIX #3: DialogContent must be direct child of Dialog, moved from UserDialog */}
                                            <DialogContent>
                                                <UserDialog
                                                    onSave={async (u) => {
                                                        try {
                                                            const result =
                                                                await createUser(
                                                                    u,
                                                                );
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
                                                <th className="px-3 py-2 text-left">
                                                    Utilisateur
                                                </th>
                                                <th className="px-3 py-2 text-left">
                                                    Matricule
                                                </th>
                                                <th className="px-3 py-2 text-left">
                                                    Rôle
                                                </th>
                                                <th className="px-3 py-2 text-left">
                                                    Email
                                                </th>
                                                <th className="px-3 py-2 text-left">
                                                    Statut
                                                </th>
                                                <th className="px-3 py-2 text-right">
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
                                                    <td className="px-3 py-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="grid h-7 w-7 place-items-center rounded-full bg-secondary text-[10px] font-bold">
                                                                {u.name
                                                                    .split(' ')
                                                                    .map(
                                                                        (s) =>
                                                                            s[0],
                                                                    )
                                                                    .join('')
                                                                    .slice(
                                                                        0,
                                                                        2,
                                                                    )}
                                                            </div>
                                                            {u.name}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 text-xs text-muted-foreground uppercase">
                                                        {u.matricule || '—'}
                                                    </td>
                                                    {/* FIX #4: Safer role display */}
                                                    <td className="px-3 text-muted-foreground">
                                                        {typeof u.role ===
                                                            'object' &&
                                                        u.role !== null
                                                            ? u.role.name
                                                            : String(
                                                                  u.role || '',
                                                              )}
                                                    </td>
                                                    <td className="px-3 text-xs text-muted-foreground">
                                                        {u.email}
                                                    </td>
                                                    <td className="px-3">
                                                        <button
                                                            onClick={() =>
                                                                toggleActive(
                                                                    u.id,
                                                                )
                                                            }
                                                            className={`rounded px-2 py-0.5 text-[10px] tracking-wider uppercase ${
                                                                u.is_active
                                                                    ? 'bg-success/15 text-success'
                                                                    : 'bg-muted text-muted-foreground'
                                                            }`}
                                                        >
                                                            {u.is_active
                                                                ? 'Actif'
                                                                : 'Inactif'}
                                                        </button>
                                                    </td>
                                                    <td className="px-3 text-right">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 w-7 p-0"
                                                            onClick={() =>
                                                                setEditing(u)
                                                            }
                                                        >
                                                            <IconPencil className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 w-7 p-0 text-destructive"
                                                            onClick={() =>
                                                                setDeleting(u)
                                                            }
                                                        >
                                                            <IconTrash className="h-3 w-3" />
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
                                                onCancel={() =>
                                                    setEditing(null)
                                                }
                                            />
                                        )}
                                    </DialogContent>
                                </Dialog>

                                <Dialog
                                    open={!!deleting}
                                    onOpenChange={(o) =>
                                        !o && setDeleting(null)
                                    }
                                >
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle className="flex items-center gap-2 font-mono text-sm tracking-wider text-destructive uppercase">
                                                <IconTrash className="h-4 w-4" />
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
                                                onClick={() =>
                                                    setDeleting(null)
                                                }
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
                                            onClick={() => {
                                                const rows = logs.map((l) => ({
                                                    Date: l.created_at
                                                        ? new Date(
                                                              l.created_at,
                                                          ).toLocaleString(
                                                              'fr-FR',
                                                          )
                                                        : '',
                                                    Utilisateur:
                                                        l.user?.name ||
                                                        'Système',
                                                    Type: l.action_type,
                                                    Message: l.message,
                                                    IP: l.ip_address || '',
                                                }));
                                                exportToCsv(
                                                    'journal-audit',
                                                    rows,
                                                );
                                            }}
                                            className="h-7 text-[10px] tracking-wider uppercase"
                                        >
                                            <IconDownload className="mr-1 h-3 w-3" />{' '}
                                            Exporter
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
                                                    <Skeleton className="h-3 w-16 text-center" />
                                                    <Skeleton className="h-3 w-14 text-center" />
                                                    <Skeleton className="h-3 w-48 text-center" />
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
                                                l.action_type === 'ERROR' ||
                                                l.action_type === 'LOGIN_FAILED'
                                                    ? 'text-destructive'
                                                    : l.action_type === 'WARN'
                                                      ? 'text-warning'
                                                      : l.action_type ===
                                                              'USER' ||
                                                          l.action_type ===
                                                              'LOGIN' ||
                                                          l.action_type ===
                                                              'LOGOUT'
                                                        ? 'text-chart-4'
                                                        : l.action_type ===
                                                            'SYSTEM'
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
                                                        className={`${color} w-24 font-bold text-center`}
                                                    >
                                                        [
                                                        {ACTION_TYPE_LABELS[
                                                            l.action_type
                                                        ] ?? l.action_type}
                                                        ]
                                                    </span>
                                                    <span className="text-chart-4 w-24 truncate text-[10px] text-center">
                                                        {l.user?.name ||
                                                            'Système'}
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
                        </TabsContent>

                        <TabsContent value="endpoints">
                            <EndpointsManager />
                        </TabsContent>
                    </Tabs>
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
                        <IconPencil className="h-4 w-4" />
                    ) : (
                        <IconPlus className="h-4 w-4" />
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
