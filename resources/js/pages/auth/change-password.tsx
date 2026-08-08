import { Head, router, usePage } from '@inertiajs/react';
import { Eye, EyeOff, KeyRound, AlertCircle, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import bacovetLogo from '@/assets/bacovet-logo.png';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type ChangePasswordFieldErrors = {
    current_password?: string;
    password?: string;
    message?: string;
};

const firstError = (value: unknown): string | null => {
    if (Array.isArray(value))
        return typeof value[0] === 'string' ? value[0] : null;
    if (typeof value === 'string') return value;
    return null;
};

export default function ChangePasswordPage() {
    const { csrf_token } = usePage<{ csrf_token: string }>().props;
    const [show, setShow] = useState(false);
    const [localErr, setLocalErr] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [data, setData] = useState({
        current_password: '',
        password: '',
        password_confirmation: '',
    });
    const [fieldErrors, setFieldErrors] =
        useState<ChangePasswordFieldErrors>({});

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalErr(null);
        setFieldErrors({});

        if (!data.current_password.trim()) {
            setLocalErr('Le mot de passe actuel est requis');
            return;
        }
        if (data.password.length < 4) {
            setLocalErr('Le nouveau mot de passe doit contenir au moins 4 caractères.');
            return;
        }
        if (data.password !== data.password_confirmation) {
            setLocalErr('La confirmation ne correspond pas.');
            return;
        }

        setProcessing(true);

        try {
            const response = await fetch('/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                body: JSON.stringify(data),
            });

            const payload = (await response.json().catch(() => null)) as {
                message?: string;
                redirect?: string;
                errors?: ChangePasswordFieldErrors;
            } | null;

            if (!response.ok) {
                const currentPasswordError = firstError(
                    payload?.errors?.current_password,
                );
                const passwordError = firstError(payload?.errors?.password);
                const messageError = firstError(payload?.errors?.message);
                const fallback = payload?.message || 'Impossible de changer le mot de passe.';
                const msg =
                    currentPasswordError || passwordError || messageError || fallback;

                setFieldErrors(payload?.errors ?? {});
                setLocalErr(msg);
                toast.error('Échec du changement de mot de passe');
                return;
            }

            toast.success('Mot de passe modifié avec succès');
            const redirectTo = payload?.redirect ?? '/';
            router.visit(redirectTo);
        } catch {
            setLocalErr("Impossible de joindre le serveur d'authentification.");
            toast.error('Échec du changement de mot de passe');
        } finally {
            setProcessing(false);
        }
    };

    const currentErrors = Object.values(fieldErrors).filter(Boolean);
    const displayError =
        localErr || (currentErrors.length > 0 ? currentErrors[0] : null);
    const hasErrors = !!displayError;

    return (
        <>
            <Head>
                <title>BACOVET — Changer le mot de passe</title>
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
                            <img
                                src={bacovetLogo}
                                alt="BACOVET"
                                className="mb-3 h-16 w-auto object-contain"
                            />
                        </div>

                        <div className="flex items-center gap-2 text-sm font-medium">
                            <KeyRound className="h-4 w-4 text-primary" />
                            <span>Changement de mot de passe obligatoire</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Pour votre sécurité, vous devez définir un nouveau
                            mot de passe avant de continuer.
                        </p>

                        {hasErrors && (
                            <Alert
                                variant="destructive"
                                className="animate-in duration-300 fade-in slide-in-from-top-2"
                            >
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle className="font-mono text-xs tracking-wider uppercase">
                                    Erreur
                                </AlertTitle>
                                <AlertDescription className="text-xs">
                                    {displayError}
                                </AlertDescription>
                            </Alert>
                        )}

                        <form className="space-y-4" onSubmit={submit}>
                            <div className="space-y-1.5">
                                <Label className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                                    Mot de passe actuel
                                </Label>

                                <Input
                                    type={show ? 'text' : 'password'}
                                    value={data.current_password}
                                    onChange={(e) => {
                                        setData((current) => ({
                                            ...current,
                                            current_password: e.target.value,
                                        }));
                                        if (fieldErrors.current_password)
                                            setFieldErrors((current) => ({
                                                ...current,
                                                current_password: undefined,
                                            }));
                                        setLocalErr(null);
                                    }}
                                    disabled={processing}
                                    className={cn(
                                        'border-border bg-secondary/50 pr-10 font-mono transition-all focus:bg-secondary placeholder:text-muted-foreground/50',
                                        (fieldErrors.current_password ||
                                            (localErr &&
                                                !data.current_password)) &&
                                            'border-destructive ring-destructive focus:ring-destructive',
                                    )}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                />
                                {fieldErrors.current_password && (
                                    <p className="mt-1 animate-in font-mono text-[10px] tracking-wider text-destructive uppercase duration-300 fade-in">
                                        {fieldErrors.current_password}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                                    Nouveau mot de passe
                                </Label>

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
                                    autoComplete="new-password"
                                />
                                {fieldErrors.password && (
                                    <p className="mt-1 animate-in font-mono text-[10px] tracking-wider text-destructive uppercase duration-300 fade-in">
                                        {fieldErrors.password}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                                    Confirmation
                                </Label>

                                <Input
                                    type={show ? 'text' : 'password'}
                                    value={data.password_confirmation}
                                    onChange={(e) => {
                                        setData((current) => ({
                                            ...current,
                                            password_confirmation:
                                                e.target.value,
                                        }));
                                        setLocalErr(null);
                                    }}
                                    disabled={processing}
                                    className="border-border bg-secondary/50 pr-10 font-mono transition-all focus:bg-secondary placeholder:text-muted-foreground/50"
                                    placeholder="••••••••"
                                    autoComplete="new-password"
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={processing}
                                className="group h-11 w-full font-mono text-xs tracking-[0.2em] uppercase transition-all text-muted-foreground"
                            >
                                {processing ? (
                                    <>
                                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                        Enregistrement...
                                    </>
                                ) : (
                                    <>
                                        Enregistrer
                                        <ArrowRight className="ml-2 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                                    </>
                                )}
                            </Button>

                            <button
                                type="button"
                                onClick={() =>
                                    router.post('/auth/logout', {
                                        _token: csrf_token,
                                    })
                                }
                                className="w-full text-center font-mono text-[10px] tracking-widest text-muted-foreground uppercase transition-colors hover:text-destructive"
                            >
                                Se déconnecter
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}
