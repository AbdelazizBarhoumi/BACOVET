import { Head, router } from '@inertiajs/react';
import {
    Eye,
    EyeOff,
    ArrowRight,
    ShieldCheck,
    AlertCircle,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DEMO_ACCOUNTS } from '@/context/AuthContext';
import { pushAudit } from '@/lib/audit';
import { cn } from '@/lib/utils';

type LoginFieldErrors = {
    matricule?: string;
    password?: string;
    message?: string;
};

const firstError = (value: unknown): string | null => {
    if (Array.isArray(value))
        return typeof value[0] === 'string' ? value[0] : null;
    if (typeof value === 'string') return value;
    return null;
};

export default function LoginPage() {
    const [show, setShow] = useState(false);
    const [localErr, setLocalErr] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [data, setData] = useState({
        matricule: '',
        password: '',
    });
    const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalErr(null);
        setFieldErrors({});

        if (!data.matricule.trim()) {
            setLocalErr('Le matricule est requis');
            return;
        }
        if (!data.password.trim()) {
            setLocalErr('Le mot de passe est requis');
            return;
        }

        pushAudit(
            'USER',
            `Tentative de connexion: ${data.matricule.toUpperCase()}`,
        );

        setProcessing(true);

        try {
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    matricule: data.matricule,
                    password: data.password,
                }),
            });

            const payload = (await response.json().catch(() => null)) as {
                message?: string;
                redirect?: string;
                errors?: LoginFieldErrors;
            } | null;

            if (!response.ok) {
                const matriculeError = firstError(payload?.errors?.matricule);
                const passwordError = firstError(payload?.errors?.password);
                const messageError = firstError(payload?.errors?.message);
                const fallback = payload?.message || 'Identifiants invalides.';
                const msg =
                    matriculeError || passwordError || messageError || fallback;

                setFieldErrors(payload?.errors ?? {});
                setLocalErr(msg);
                toast.error('Échec de la connexion');
                return;
            }

            const redirectTo = payload?.redirect ?? '/dashboard';
            router.visit(redirectTo);
        } catch {
            setLocalErr("Impossible de joindre le serveur d'authentification.");
            toast.error('Échec de la connexion');
        } finally {
            setProcessing(false);
            setData((current) => ({ ...current, password: '' }));
        }
    };

    const currentErrors = Object.values(fieldErrors).filter(Boolean);
    const displayError =
        localErr || (currentErrors.length > 0 ? currentErrors[0] : null);
    const hasErrors = !!displayError;

    return (
        <>
            <Head>
                <title>BACOVET — Pilotage Opérationnel</title>
                <meta
                    name="description"
                    content="Accès privé au tableau de bord opérationnel BACOVET."
                />
            </Head>

            <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4">
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.04]"
                    style={{
                        backgroundImage:
                            'linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)',
                        backgroundSize: '40px 40px',
                    }}
                />

                <div className="relative w-full max-w-md">
                    <div className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-2xl md:p-8">
                        <div className="flex flex-col items-center">
                            <div className="mb-3 grid h-14 w-14 place-items-center rounded-lg bg-primary font-mono text-2xl font-bold text-primary-foreground shadow-lg shadow-primary/20">
                                B
                            </div>

                            <h1 className="text-xl font-bold tracking-[0.3em]">
                                BACOVET
                            </h1>

                            <div className="mt-1 text-[11px] tracking-[0.25em] text-muted-foreground uppercase">
                                Pilotage Opérationnel
                            </div>

                            <div className="mt-4 flex items-center gap-2 font-mono text-[10px] tracking-wider text-primary/80">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                <span>ACCÈS PRIVÉ</span>
                                <span className="text-muted-foreground opacity-50">
                                    |
                                </span>
                                <span>AUTH UNIQUE</span>
                            </div>
                        </div>

                        {hasErrors && (
                            <Alert
                                variant="destructive"
                                className="animate-in duration-300 fade-in slide-in-from-top-2"
                            >
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle className="font-mono text-xs tracking-wider uppercase">
                                    Erreur d'accès
                                </AlertTitle>
                                <AlertDescription className="text-xs">
                                    {displayError}
                                </AlertDescription>
                            </Alert>
                        )}

                        <form className="space-y-4" onSubmit={submit}>
                            <div className="space-y-1.5">
                                <Label className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                                    Matricule / EID (Email)
                                </Label>

                                <Input
                                    value={data.matricule}
                                    onChange={(e) => {
                                        setData((current) => ({
                                            ...current,
                                            matricule: e.target.value,
                                        }));
                                        if (fieldErrors.matricule)
                                            setFieldErrors((current) => ({
                                                ...current,
                                                matricule: undefined,
                                            }));
                                        setLocalErr(null);
                                    }}
                                    disabled={processing}
                                    className={cn(
                                        'border-border bg-secondary/50 font-mono transition-all focus:bg-secondary',
                                        (fieldErrors.matricule ||
                                            (localErr && !data.matricule)) &&
                                            'border-destructive ring-destructive focus:ring-destructive',
                                    )}
                                    placeholder="admin@example.com"
                                    autoComplete="username"
                                />
                                {fieldErrors.matricule && (
                                    <p className="mt-1 animate-in font-mono text-[10px] tracking-wider text-destructive uppercase duration-300 fade-in">
                                        {fieldErrors.matricule}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                                    Clé de sécurité
                                </Label>

                                <div className="relative">
                                    <Input
                                        type={show ? 'text' : 'password'}
                                        value={data.password}
                                        onChange={(e) => {
                                            setData((current) => ({
                                                ...current,
                                                password: e.target.value,
                                            }));
                                            if (fieldErrors.password)
                                                setFieldErrors((current) => ({
                                                    ...current,
                                                    password: undefined,
                                                }));
                                            setLocalErr(null);
                                        }}
                                        disabled={processing}
                                        className={cn(
                                            'border-border bg-secondary/50 pr-10 font-mono transition-all focus:bg-secondary',
                                            (fieldErrors.password ||
                                                (localErr && !data.password)) &&
                                                'border-destructive ring-destructive focus:ring-destructive',
                                        )}
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                    />

                                    <button
                                        type="button"
                                        onClick={() => setShow((s) => !s)}
                                        className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
                                    >
                                        {show ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                                {fieldErrors.password && (
                                    <p className="mt-1 animate-in font-mono text-[10px] tracking-wider text-destructive uppercase duration-300 fade-in">
                                        {fieldErrors.password}
                                    </p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                disabled={processing}
                                className="group h-11 w-full font-mono text-xs tracking-[0.2em] uppercase transition-all"
                            >
                                {processing ? (
                                    <>
                                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                        Validation...
                                    </>
                                ) : (
                                    <>
                                        Validation Identité
                                        <ArrowRight className="ml-2 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                                    </>
                                )}
                            </Button>
                        </form>

                        <div className="flex items-center justify-between border-t border-border pt-4 font-mono text-[10px] tracking-wider uppercase">
                            <span className="inline-flex items-center gap-1.5 text-success">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                                Réseau : connecté
                            </span>

                            <button
                                type="button"
                                onClick={() => {
                                    setData({ matricule: '', password: '' });
                                    setFieldErrors({});
                                    setLocalErr(null);
                                }}
                                className="text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                            >
                                Réinitialiser
                            </button>
                        </div>
                    </div>

                    <p className="mt-8 text-center font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase opacity-60">
                        Excellence industrielle — BACOVET Group
                    </p>

                    <details className="group mt-4 font-mono text-[10px] text-muted-foreground/80">
                        <summary className="cursor-pointer list-none rounded-lg border border-border/50 py-2 text-center tracking-widest uppercase transition-colors hover:bg-secondary/20 hover:text-foreground">
                            Comptes de démonstration
                        </summary>

                        <div className="mt-3 animate-in space-y-2 rounded-lg border border-border/50 bg-card/60 p-4 backdrop-blur-sm duration-300 slide-in-from-bottom-2">
                            <div className="mb-2 border-b border-border/30 pb-2 text-[10px] text-muted-foreground">
                                Mot de passe commun :{' '}
                                <span className="ml-1 rounded bg-secondary px-1.5 py-0.5 font-bold text-foreground">
                                    demo
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                                {Object.entries(DEMO_ACCOUNTS).map(
                                    ([mat, a]) => (
                                        <button
                                            key={mat}
                                            type="button"
                                            onClick={() => {
                                                setData({
                                                    matricule: mat,
                                                    password: 'demo',
                                                });
                                                setFieldErrors({});
                                                setLocalErr(null);
                                            }}
                                            className="group/item flex items-center justify-between rounded border border-transparent p-2 text-left transition-colors hover:border-primary/20 hover:bg-primary/5"
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-bold text-primary group-hover/item:underline">
                                                    {mat}
                                                </span>
                                                <span className="text-[9px] uppercase opacity-60">
                                                    {a.name}
                                                </span>
                                            </div>
                                            <span className="rounded bg-secondary px-1.5 py-0.5 text-[9px] text-muted-foreground group-hover/item:text-foreground">
                                                {a.role}
                                            </span>
                                        </button>
                                    ),
                                )}
                            </div>
                        </div>
                    </details>
                </div>
            </div>
        </>
    );
}
