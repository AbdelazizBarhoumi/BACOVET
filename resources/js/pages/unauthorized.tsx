import { Head, Link } from '@inertiajs/react';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function UnauthorizedPage() {
    return (
        <>
            <Head title="Accès Refusé — BACOVET" />
            <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
                <div className="mb-6 rounded-full bg-destructive/10 p-4">
                    <ShieldAlert className="h-12 w-12 text-destructive" />
                </div>
                <h1 className="mb-2 text-2xl font-bold tracking-tight">
                    Accès Non Autorisé
                </h1>
                <p className="mb-8 max-w-md text-muted-foreground">
                    Vous n'avez pas les permissions nécessaires pour accéder à
                    cette page. Veuillez contacter votre administrateur si vous
                    pensez qu'il s'agit d'une erreur.
                </p>
                <div className="flex gap-4">
                    <Button asChild variant="outline">
                        <Link href="/login">Se reconnecter</Link>
                    </Button>
                    <Button asChild>
                        <Link href="/">Retour à l'accueil</Link>
                    </Button>
                </div>
            </div>
        </>
    );
}
