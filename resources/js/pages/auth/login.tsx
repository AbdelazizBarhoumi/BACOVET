import { Head, router } from '@inertiajs/react';
import {
    Eye,
    EyeOff,
    ArrowRight,
    AlertCircle,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import bacovetLogo from '@/assets/bacovet-logo.png';
import ThemeToggle from '@/components/ThemeToggle';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

            const redirectTo = payload?.redirect ?? '/';
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
                <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
                    style={{
                        backgroundImage:
                            'linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)',
                        backgroundSize: '40px 40px',
                    }}
                />

                <div className="absolute top-4 right-4 z-10">
                    <ThemeToggle />
                </div>

                <div className="relative w-full max-w-md">
                    <div className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-2xl md:p-8">
                        <div className="flex flex-col items-center">
                            <img
                                src={bacovetLogo}
                                alt="BACOVET"
                                className="mb-3 h-16 w-auto object-contain"
                            />
    
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
                                        'border-border bg-secondary/50 font-mono transition-all focus:bg-secondary placeholder:text-muted-foreground/50',
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
                                            'border-border bg-secondary/50 pr-10 font-mono transition-all focus:bg-secondary placeholder:text-muted-foreground/50',
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
                    </div>
                </div>
            </div>
        </>
    );
}
