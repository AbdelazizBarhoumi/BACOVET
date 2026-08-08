import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Panel } from '@/components/widgets';
import {
    fetchMaintenanceCommands,
    startMaintenanceRun,
    type MaintenanceCommand,
    type MaintenanceRunResult,
} from '@/services/maintenanceApi';

const CATEGORY_LABELS: Record<string, string> = {
    info: 'Informations',
    cache: 'Cache & Optimisation',
    database: 'Base de données',
    queue: "File d'attente & Planificateur",
    sync: 'Synchronisation des données',
    export: 'Exports',
    maintenance: 'Mode maintenance',
};

function IconTerminal({ className = '' }: { className?: string }) {
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
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" x2="20" y1="19" y2="19" />
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

function IconLoader({ className = '' }: { className?: string }) {
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
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    );
}

export default function MaintenancePage() {
    const [token, setToken] = useState('');
    const [commands, setCommands] = useState<MaintenanceCommand[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<MaintenanceRunResult[]>([]);
    const [runningId, setRunningId] = useState<string | null>(null);
    const [confirmCommand, setConfirmCommand] =
        useState<MaintenanceCommand | null>(null);

    useEffect(() => {
        let isMounted = true;
        fetchMaintenanceCommands()
            .then((cmds) => {
                if (isMounted) setCommands(cmds);
            })
            .catch((e: Error) => {
                if (isMounted) setError(e.message);
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    const actuallyStart = async (cmd: MaintenanceCommand) => {
        if (!token.trim()) {
            toast.error('Saisissez le token de maintenance');
            return;
        }
        setRunningId(cmd.id);
        try {
            const result = await startMaintenanceRun(cmd.id, token.trim());
            setResults((prev) => [result, ...prev]);
            if (result.success) {
                toast.success(`« ${cmd.label} » terminée avec succès`);
            } else {
                toast.error(
                    `« ${cmd.label} » a échoué (code ${result.exit_code})`,
                );
            }
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Erreur inconnue');
        } finally {
            setRunningId(null);
            setConfirmCommand(null);
        }
    };

    const handleRun = (cmd: MaintenanceCommand) => {
        if (!token.trim()) {
            toast.error('Saisissez le token de maintenance');
            return;
        }
        if (cmd.confirm) {
            setConfirmCommand(cmd);
            return;
        }
        actuallyStart(cmd);
    };

    const grouped = commands.reduce<Record<string, MaintenanceCommand[]>>(
        (acc, cmd) => {
            const key = cmd.category || 'other';
            if (!acc[key]) acc[key] = [];
            acc[key].push(cmd);
            return acc;
        },
        {},
    );

    return (
        <>
            <Head title="Maintenance — BACOVET" />
            <AppShell
                page="/maintenance"
                title="Maintenance"
                subtitle="Exécution de commandes artisan"
            >
                <div className="space-y-4">
                    {error && (
                        <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-destructive">
                            <IconAlertTriangle className="h-5 w-5" />
                            <div className="text-xs font-bold uppercase">
                                {error}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-warning">
                        <IconAlertTriangle className="h-5 w-5" />
                        <div className="text-xs">
                            <p className="font-bold uppercase">
                                Accès réservé à l'équipe IT
                            </p>
                            <p>
                                La commande s'exécute en direct : la page attend
                                la fin de l'exécution avant d'afficher le
                                résultat. Les commandes longues (synchronisations)
                                peuvent prendre plusieurs minutes.
                            </p>
                        </div>
                    </div>

                    <Panel title="Token de maintenance">
                        <div className="flex flex-wrap items-end gap-4">
                            <div className="w-full max-w-sm">
                                <Label htmlFor="maintenance-token">
                                    Token
                                </Label>
                                <Input
                                    id="maintenance-token"
                                    type="password"
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                    placeholder="••••••••••••"
                                    autoComplete="off"
                                    className="mt-1 font-mono"
                                />
                            </div>
                        </div>
                    </Panel>

                    {results.length > 0 && (
                        <Panel title="Résultats">
                            <div className="space-y-3">
                                {results.map((result, idx) => (
                                    <div
                                        key={`${result.command}-${idx}`}
                                        className="rounded-lg border border-border p-3"
                                    >
                                        <div className="mb-2 flex items-center gap-3">
                                            <span className="flex-1 truncate font-mono text-xs font-bold">
                                                {result.label}
                                            </span>
                                            <span
                                                className={`text-[10px] tracking-wider uppercase ${
                                                    result.success
                                                        ? 'text-success'
                                                        : 'text-destructive'
                                                }`}
                                            >
                                                {result.success
                                                    ? 'OK'
                                                    : `Erreur (${result.exit_code})`}
                                            </span>
                                        </div>
                                        <div className="mb-2 font-mono text-[10px] text-muted-foreground">
                                            php artisan {result.command}
                                        </div>
                                        {result.error && (
                                            <div className="mb-2 rounded bg-destructive/10 p-2 text-[11px] text-destructive">
                                                {result.error}
                                            </div>
                                        )}
                                        <pre className="max-h-48 overflow-auto rounded bg-muted p-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                                            {result.output ||
                                                '(aucune sortie)'}
                                        </pre>
                                    </div>
                                ))}
                            </div>
                        </Panel>
                    )}

                    <Panel title="Commandes artisan autorisées">
                        {loading ? (
                            <div className="flex items-center justify-center py-10">
                                <IconLoader className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : Object.keys(grouped).length === 0 ? (
                            <p className="py-6 text-center text-xs text-muted-foreground">
                                Aucune commande disponible.
                            </p>
                        ) : (
                            Object.entries(grouped).map(([category, cmds]) => (
                                <div key={category} className="mb-4 last:mb-0">
                                    <div className="mb-2 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                                        {CATEGORY_LABELS[category] || category}
                                    </div>
                                    <div className="space-y-2">
                                        {cmds.map((cmd) => (
                                            <div
                                                key={cmd.id}
                                                className="flex items-center gap-4 rounded-lg border border-border/60 px-3 py-2"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold">
                                                            {cmd.label}
                                                        </span>
                                                        <code className="font-mono text-[10px] text-muted-foreground">
                                                            php artisan{' '}
                                                            {cmd.signature}
                                                        </code>
                                                    </div>
                                                    {cmd.description && (
                                                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                            {cmd.description}
                                                        </p>
                                                    )}
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant={
                                                        cmd.confirm
                                                            ? 'outline'
                                                            : 'default'
                                                    }
                                                    disabled={
                                                        runningId !== null ||
                                                        !token.trim()
                                                    }
                                                    onClick={() =>
                                                        handleRun(cmd)
                                                    }
                                                    className="h-7 shrink-0 text-[10px] tracking-wider uppercase"
                                                >
                                                    {runningId === cmd.id ? (
                                                        <>
                                                            <IconLoader className="mr-1 h-3 w-3 animate-spin" />
                                                            Exécution…
                                                        </>
                                                    ) : (
                                                        <>
                                                            <IconTerminal className="mr-1 h-3 w-3" />
                                                            Exécuter
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </Panel>
                </div>

                <Dialog
                    open={!!confirmCommand}
                    onOpenChange={(o) => !o && setConfirmCommand(null)}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Confirmer l'exécution</DialogTitle>
                            <DialogDescription>
                                Lancer{' '}
                                <code className="font-mono text-xs">
                                    php artisan {confirmCommand?.signature}
                                </code>{' '}
                                sur le serveur de production ? Cette action
                                peut être sensible.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setConfirmCommand(null)}
                                disabled={runningId !== null}
                            >
                                Annuler
                            </Button>
                            <Button
                                onClick={() =>
                                    confirmCommand &&
                                    actuallyStart(confirmCommand)
                                }
                                disabled={runningId !== null}
                            >
                                {runningId !== null ? 'Exécution…' : 'Confirmer'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </AppShell>
        </>
    );
}
