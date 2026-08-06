import { Head, router } from '@inertiajs/react';
import { Loader2, Lock, Mail, ChevronRight, CheckCircle2 } from 'lucide-react';
import React, { useState } from 'react';

const EMAILS = [
    { email: 'superadmin@novationcity.com', name: 'Super administrateur' },
    { email: 'm.chrifa@novationcity.com', name: 'M. Chrifa' },
    { email: 'benhadjmbareknourhene@gmail.com', name: 'Ben Hadj Mbarek Nourhene' },
    { email: 's.lafi@novationcity.com', name: 'Samar Lafi' },
    { email: 'intissar@bacovet.com', name: 'Intissar' },
    { email: 'azer.boughrara@bacovet.com', name: 'Azer Boughrara' },
    { email: 'amira@bacovet.com', name: 'Amira' },
    { email: 'qualite@bacovet.com', name: 'Dhoha ' },
    { email: 'saadia@bacovet.com', name: 'Saadia' },
    { email: 'wassim@bacovet.com', name: 'Wassim' },
];

type Step = 'email' | 'password' | 'create-password';

function getCsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

export default function V5LoginPage() {
    const [step, setStep] = useState<Step>('email');
    const [selectedEmail, setSelectedEmail] = useState('');
    const [selectedName, setSelectedName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSelectEmail = async (email: string, name: string) => {
        setSelectedEmail(email);
        setSelectedName(name);
        setError('');
        setPassword('');
        setConfirmPassword('');
        setLoading(true);
        try {
            const res = await fetch('/api/v5-auth/check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.message || 'Erreur');
                return;
            }
            setStep(data.has_password ? 'password' : 'create-password');
        } catch {
            setError('Erreur réseau');
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (password !== confirmPassword) {
            setError('Les mots de passe ne correspondent pas.');
            return;
        }
        if (password.length < 4) {
            setError('Le mot de passe doit faire au moins 4 caractères.');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/v5-auth/set-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
                body: JSON.stringify({ email: selectedEmail, password }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.message || 'Erreur');
                return;
            }
            router.visit('/v5');
        } catch {
            setError('Erreur réseau');
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/v5-auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
                body: JSON.stringify({ email: selectedEmail, password }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.message || 'Erreur de connexion');
                return;
            }
            router.visit('/v5');
        } catch {
            setError('Erreur réseau');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Head title="Connexion V5 — BACOVET" />
            <div className="w-full max-w-sm">
                <div className="rounded-lg border border-border bg-card p-6 shadow-lg">
                    <div className="mb-6 flex items-center gap-2">
                        <Lock className="h-5 w-5 text-primary" />
                        <h1 className="text-lg font-semibold">
                            Constructeur de pages V5
                        </h1>
                    </div>

                    {step === 'email' && (
                        <div className="space-y-2">
                            <p className="mb-3 text-xs text-muted-foreground">
                                Sélectionnez votre compte :
                            </p>
                            {EMAILS.map((u) => (
                                <button
                                    key={u.email}
                                    onClick={() =>
                                        handleSelectEmail(u.email, u.name)
                                    }
                                    disabled={loading}
                                    className="flex w-full cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2.5 text-left transition-colors hover:bg-secondary/50 disabled:opacity-50"
                                >
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                        <span className="text-xs font-bold text-primary">
                                            {u.name[0]}
                                        </span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-medium">
                                            {u.name}
                                        </div>
                                        <div className="truncate text-[10px] text-muted-foreground">
                                            {u.email}
                                        </div>
                                    </div>
                                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                                </button>
                            ))}
                        </div>
                    )}

                    {step === 'create-password' && (
                        <form
                            onSubmit={handleCreatePassword}
                            className="space-y-4"
                        >
                            <div className="mb-1 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <span className="text-xs text-muted-foreground">
                                    Bienvenue, <strong>{selectedName}</strong>
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Créez votre mot de passe pour la première
                                connexion.
                            </p>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                    Nouveau mot de passe
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    placeholder="••••••••"
                                    className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    autoFocus
                                    required
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                    Confirmer
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) =>
                                        setConfirmPassword(e.target.value)
                                    }
                                    placeholder="••••••••"
                                    className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    required
                                />
                            </div>
                            {error && (
                                <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                                    {error}
                                </div>
                            )}
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStep('email');
                                        setPassword('');
                                        setConfirmPassword('');
                                        setError('');
                                    }}
                                    className="cursor-pointer rounded-md border border-border px-3 py-2 text-xs hover:bg-secondary"
                                >
                                    Retour
                                </button>
                                <button
                                    type="submit"
                                    disabled={
                                        loading || !password || !confirmPassword
                                    }
                                    className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : null}{' '}
                                    Créer et se connecter
                                </button>
                            </div>
                        </form>
                    )}

                    {step === 'password' && (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="mb-1 flex items-center gap-2">
                                <Mail className="h-4 w-4 text-primary" />
                                <span className="text-xs text-muted-foreground">
                                    <strong>{selectedName}</strong>
                                </span>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                    Mot de passe
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    placeholder="••••••••"
                                    className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    autoFocus
                                    required
                                />
                            </div>
                            {error && (
                                <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                                    {error}
                                </div>
                            )}
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStep('email');
                                        setPassword('');
                                        setError('');
                                    }}
                                    className="cursor-pointer rounded-md border border-border px-3 py-2 text-xs hover:bg-secondary"
                                >
                                    Retour
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !password}
                                    className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : null}{' '}
                                    Connexion
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
