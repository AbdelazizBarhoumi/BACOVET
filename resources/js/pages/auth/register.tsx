import { Head } from '@inertiajs/react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import AuthLayout from '@/layouts/auth-layout';

export default function Register() {
    return (
        <AuthLayout
            title="Créer un compte"
            description="L'inscription est réservée aux administrateurs BACOVET."
        >
            <Head title="Register" />

            <div className="space-y-4 text-sm text-muted-foreground">
                <div className="rounded-lg border border-border bg-secondary/30 p-4">
                    <div className="flex items-center gap-2 text-foreground font-semibold">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        Compte géré par l’équipe BACOVET
                    </div>
                    <p className="mt-2">
                        La création de compte est contrôlée côté backend. Si vous avez besoin d’un accès,
                        contactez l’administrateur système.
                    </p>
                </div>

                <a
                    href="/login"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                    Retour à la connexion
                    <ArrowRight className="h-4 w-4" />
                </a>
            </div>
        </AuthLayout>
    );
}
