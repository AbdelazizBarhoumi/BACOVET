import { Head, router } from "@inertiajs/react";
import { Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEMO_ACCOUNTS } from "@/context/AuthContext";
import { pushAudit } from "@/lib/audit";
import { cn } from "@/lib/utils";

type LoginFieldErrors = {
  matricule?: string;
  password?: string;
  message?: string;
};

const firstError = (value: unknown): string | null => {
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : null;
  if (typeof value === "string") return value;
  return null;
};

export default function LoginPage() {
  const [show, setShow] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [data, setData] = useState({
    matricule: "",
    password: "",
  });
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalErr(null);
    setFieldErrors({});

    if (!data.matricule.trim()) {
      setLocalErr("Le matricule est requis");
      return;
    }
    if (!data.password.trim()) {
      setLocalErr("Le mot de passe est requis");
      return;
    }

    pushAudit("USER", `Tentative de connexion: ${data.matricule.toUpperCase()}`);

    setProcessing(true);

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          matricule: data.matricule,
          password: data.password,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string; redirect?: string; errors?: LoginFieldErrors }
        | null;

      if (!response.ok) {
        const matriculeError = firstError(payload?.errors?.matricule);
        const passwordError = firstError(payload?.errors?.password);
        const messageError = firstError(payload?.errors?.message);
        const fallback = payload?.message || "Identifiants invalides.";
        const msg = matriculeError || passwordError || messageError || fallback;

        setFieldErrors(payload?.errors ?? {});
        setLocalErr(msg);
        toast.error("Échec de la connexion");
        return;
      }

      const redirectTo = payload?.redirect ?? "/dashboard";
      router.visit(redirectTo);
    } catch {
      setLocalErr("Impossible de joindre le serveur d'authentification.");
      toast.error("Échec de la connexion");
    } finally {
      setProcessing(false);
      setData((current) => ({ ...current, password: "" }));
    }
  };

  const currentErrors = Object.values(fieldErrors).filter(Boolean);
  const displayError = localErr || (currentErrors.length > 0 ? currentErrors[0] : null);
  const hasErrors = !!displayError;

  return (
    <>
      <Head>
        <title>BACOVET — Pilotage Opérationnel</title>
        <meta name="description" content="Accès privé au tableau de bord opérationnel BACOVET." />
      </Head>

      <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden px-4">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative w-full max-w-md">
          <div className="rounded-xl border border-border bg-card p-6 md:p-8 shadow-2xl space-y-6">
            <div className="flex flex-col items-center">
              <div className="h-14 w-14 rounded-lg bg-primary text-primary-foreground grid place-items-center font-mono text-2xl font-bold mb-3 shadow-lg shadow-primary/20">
                B
              </div>

              <h1 className="text-xl font-bold tracking-[0.3em]">BACOVET</h1>

              <div className="text-[11px] tracking-[0.25em] text-muted-foreground uppercase mt-1">
                Pilotage Opérationnel
              </div>

              <div className="mt-4 flex items-center gap-2 text-[10px] font-mono tracking-wider text-primary/80">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>ACCÈS PRIVÉ</span>
                <span className="text-muted-foreground opacity-50">|</span>
                <span>AUTH UNIQUE</span>
              </div>
            </div>

            {hasErrors && (
              <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="font-mono text-xs uppercase tracking-wider">Erreur d'accès</AlertTitle>
                <AlertDescription className="text-xs">
                  {displayError}
                </AlertDescription>
              </Alert>
            )}

            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                  Matricule / EID (Email)
                </Label>

                <Input
                  value={data.matricule}
                  onChange={(e) => {
                    setData((current) => ({ ...current, matricule: e.target.value }));
                    if (fieldErrors.matricule) setFieldErrors((current) => ({ ...current, matricule: undefined }));
                    setLocalErr(null);
                  }}
                  disabled={processing}
                  className={cn(
                    "bg-secondary/50 border-border font-mono transition-all focus:bg-secondary",
                    (fieldErrors.matricule || (localErr && !data.matricule)) && "border-destructive ring-destructive focus:ring-destructive",
                  )}
                  placeholder="admin@example.com"
                  autoComplete="username"
                />
                {fieldErrors.matricule && (
                  <p className="text-[10px] text-destructive font-mono uppercase tracking-wider mt-1 animate-in fade-in duration-300">
                    {fieldErrors.matricule}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                  Clé de sécurité
                </Label>

                <div className="relative">
                  <Input
                    type={show ? "text" : "password"}
                    value={data.password}
                    onChange={(e) => {
                      setData((current) => ({ ...current, password: e.target.value }));
                      if (fieldErrors.password) setFieldErrors((current) => ({ ...current, password: undefined }));
                      setLocalErr(null);
                    }}
                    disabled={processing}
                    className={cn(
                      "bg-secondary/50 border-border font-mono pr-10 transition-all focus:bg-secondary",
                      (fieldErrors.password || (localErr && !data.password)) && "border-destructive ring-destructive focus:ring-destructive",
                    )}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />

                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-[10px] text-destructive font-mono uppercase tracking-wider mt-1 animate-in fade-in duration-300">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={processing}
                className="w-full font-mono uppercase tracking-[0.2em] text-xs h-11 transition-all group"
              >
                {processing ? (
                  <>
                    <span className="mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Validation...
                  </>
                ) : (
                  <>
                    Validation Identité
                    <ArrowRight className="h-3.5 w-3.5 ml-2 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </form>

            <div className="pt-4 border-t border-border flex items-center justify-between text-[10px] font-mono uppercase tracking-wider">
              <span className="inline-flex items-center gap-1.5 text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                Réseau : connecté
              </span>

              <button
                type="button"
                onClick={() => {
                    setData({ matricule: "", password: "" });
                    setFieldErrors({});
                    setLocalErr(null);
                }}
                className="text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
              >
                Réinitialiser
              </button>
            </div>
          </div>

          <p className="text-center text-[10px] font-mono tracking-[0.2em] text-muted-foreground mt-8 uppercase opacity-60">
            Excellence industrielle — BACOVET Group
          </p>

          <details className="mt-4 text-[10px] font-mono text-muted-foreground/80 group">
            <summary className="cursor-pointer text-center uppercase tracking-widest hover:text-foreground transition-colors list-none py-2 border border-border/50 rounded-lg hover:bg-secondary/20">
              Comptes de démonstration
            </summary>

            <div className="mt-3 rounded-lg border border-border/50 bg-card/60 backdrop-blur-sm p-4 space-y-2 animate-in slide-in-from-bottom-2 duration-300">
              <div className="text-[10px] mb-2 text-muted-foreground pb-2 border-b border-border/30">
                Mot de passe commun : <span className="text-foreground font-bold px-1.5 py-0.5 bg-secondary rounded ml-1">demo</span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {Object.entries(DEMO_ACCOUNTS).map(([mat, a]) => (
                    <button
                        key={mat}
                        type="button"
                        onClick={() => {
                          setData({ matricule: mat, password: "demo" });
                          setFieldErrors({});
                          setLocalErr(null);
                        }}
                        className="flex items-center justify-between p-2 rounded hover:bg-primary/5 transition-colors border border-transparent hover:border-primary/20 group/item text-left"
                    >
                        <div className="flex flex-col">
                            <span className="text-primary font-bold group-hover/item:underline">{mat}</span>
                            <span className="text-[9px] opacity-60 uppercase">{a.name}</span>
                        </div>
                        <span className="text-[9px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground group-hover/item:text-foreground">
                            {a.role}
                        </span>
                    </button>
                ))}
              </div>
            </div>
          </details>
        </div>
      </div>
    </>
  );
}

