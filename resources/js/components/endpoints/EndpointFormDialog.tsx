import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
import { stringifyValue } from '@/lib/json-utils';
import {
    testEndpoint,
    type EndpointEntry,
    type EndpointPayload,
    type TestEndpointResult,
} from '@/services/endpointManagerApi';

type FieldErrors = Partial<Record<'name' | 'endpoint', string>>;

const URL_RE = /^https?:\/\/.+/i;
const TEST_DEBOUNCE_MS = 500;
const TEST_TIMEOUT_S = 60;

function isTimeoutError(err: unknown): boolean {
    return (
        err instanceof DOMException &&
        (err.name === 'AbortError' || err.name === 'TimeoutError')
    );
}

function splitEndpointUrl(url: string): { root: string; path: string } {
    try {
        const u = new URL(url);
        return {
            root: `${u.protocol}//${u.host}`,
            path: `${u.pathname}${u.search}`.replace(/^\/+/, ''),
        };
    } catch {
        return { root: '', path: url };
    }
}

function TestEndpointFields({
    entry,
    defaultRoot,
    busy,
    onCancel,
    onSubmit,
}: {
    entry?: EndpointEntry | null;
    defaultRoot: string;
    busy: boolean;
    onCancel: () => void;
    onSubmit: (payload: EndpointPayload) => void;
}) {
    const initial = useMemo(
        () =>
            entry ? splitEndpointUrl(entry.endpoint) : { root: '', path: '' },
        [entry],
    );
    const [name, setName] = useState(entry?.name ?? '');
    const [method, setMethod] = useState<'GET' | 'POST'>(
        entry?.method ?? 'GET',
    );
    const [baseUrl, setBaseUrl] = useState(initial.root);
    const [path, setPath] = useState(initial.path);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<TestEndpointResult | null>(
        null,
    );
    const [errors, setErrors] = useState<FieldErrors>({});
    const [secondsLeft, setSecondsLeft] = useState(TEST_TIMEOUT_S);
    const testAbortRef = useRef<AbortController | null>(null);

    const paramsChanged = entry
        ? method !== entry.method ||
          baseUrl.trim() !== initial.root ||
          path.trim() !== initial.path
        : true;

    const effectiveRoot = baseUrl.trim() || defaultRoot;
    const fresh = testResult?.success === true;
    const editUnchanged = Boolean(entry) && !paramsChanged;
    const canSave = !busy && !testing && (fresh || editUnchanged);

    const displayUrl = fresh ? testResult.url : (entry?.endpoint ?? '');
    const displayResponse = fresh
        ? testResult.response
        : (entry?.response ?? null);
    const previewLabel = fresh
        ? 'Réponse (récupérée automatiquement)'
        : 'Réponse actuelle (lecture seule)';

    const prettyResponse = useMemo(
        () => (displayResponse !== null ? stringifyValue(displayResponse) : ''),
        [displayResponse],
    );

    const validate = (): FieldErrors => {
        const next: FieldErrors = {};
        if (!name.trim()) {
            next.name = 'Le nom est obligatoire';
        }
        if (!path.trim()) {
            next.endpoint = 'Le chemin est obligatoire';
        }
        const root = baseUrl.trim();
        if (root && !URL_RE.test(root)) {
            next.endpoint = 'La racine API doit être une URL http(s) valide';
        }
        return next;
    };

    // Auto-test (debounced) whenever the request inputs change or on open.
    useEffect(() => {
        let canceled = false;
        const timer = setTimeout(async () => {
            const nextErrors = validate();
            setErrors(nextErrors);
            if (Object.keys(nextErrors).length > 0) {
                setTestResult(null);
                setTesting(false);
                return;
            }
            if (entry && !paramsChanged) {
                setTestResult(null);
                setTesting(false);
                return;
            }
            const controller = new AbortController();
            testAbortRef.current = controller;
            setSecondsLeft(TEST_TIMEOUT_S);
            setTesting(true);
            try {
                const result = await testEndpoint(
                    {
                        name: name.trim(),
                        method,
                        path: path.trim(),
                        baseUrl: effectiveRoot,
                    },
                    controller.signal,
                );
                if (canceled) return;
                setTestResult(result);
            } catch (err) {
                if (canceled) return;
                setTestResult({
                    success: false,
                    status: null,
                    error: isTimeoutError(err)
                        ? `Délai de requête dépassé après ${TEST_TIMEOUT_S} secondes`
                        : err instanceof Error
                          ? err.message
                          : 'Échec de la requête',
                });
            } finally {
                if (!canceled) {
                    setTesting(false);
                }
            }
        }, TEST_DEBOUNCE_MS);
        return () => {
            canceled = true;
            clearTimeout(timer);
            testAbortRef.current?.abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [name, method, baseUrl, path, entry?.id]);

    // Countdown timer shown while a test is in flight; aborts at 0.
    useEffect(() => {
        if (!testing) return;
        const interval = setInterval(() => {
            setSecondsLeft((s) => {
                if (s <= 1) {
                    clearInterval(interval);
                    testAbortRef.current?.abort();
                    return 0;
                }
                return s - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [testing]);

    const handleSubmit = () => {
        if (!canSave) {
            return;
        }
        onSubmit({
            name: name.trim(),
            method,
            endpoint: displayUrl,
            status: 200,
            response: displayResponse,
        });
    };

    return (
        <>
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                    <Label className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                        Nom
                    </Label>
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="ex. 01 — ItemTrxEnq (SDT)"
                        className="font-mono text-sm"
                    />
                    {errors.name && (
                        <p className="text-[10px] font-medium text-destructive">
                            {errors.name}
                        </p>
                    )}
                </div>

                <div className="space-y-1.5">
                    <Label className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                        Méthode
                    </Label>
                    <Select
                        value={method}
                        onValueChange={(value) =>
                            setMethod(value as 'GET' | 'POST')
                        }
                    >
                        <SelectTrigger className="font-mono">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="GET">GET</SelectItem>
                            <SelectItem value="POST">POST</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                        Racine API
                    </Label>
                    <Input
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        placeholder={
                            defaultRoot
                                ? defaultRoot
                                : 'https://api.example.com'
                        }
                        className="font-mono text-sm"
                    />
                    {!baseUrl.trim() && defaultRoot && (
                        <p className="text-[10px] text-muted-foreground">
                            Utilisation de la racine par défaut :{' '}
                            <span className="font-mono">{defaultRoot}</span>
                        </p>
                    )}
                    {errors.endpoint && (
                        <p className="text-[10px] font-medium text-destructive">
                            {errors.endpoint}
                        </p>
                    )}
                </div>

                <div className="col-span-2 space-y-1.5">
                    <Label className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                        Chemin
                    </Label>
                    <Input
                        value={path}
                        onChange={(e) => setPath(e.target.value)}
                        placeholder="api/data/itemtrxenq"
                        className="font-mono text-sm"
                    />
                    {errors.endpoint && (
                        <p className="text-[10px] font-medium text-destructive">
                            {errors.endpoint}
                        </p>
                    )}
                </div>

                {testing && (
                    <div className="col-span-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Test de l'endpoint…
                        <span
                            className={`inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                                secondsLeft <= 5
                                    ? 'bg-destructive/10 text-destructive'
                                    : 'bg-muted text-muted-foreground'
                            }`}
                        >
                            {secondsLeft}s
                        </span>
                    </div>
                )}

                {testResult && !testResult.success && !testing && (
                    <div className="col-span-2 rounded border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        <div className="flex items-center gap-1.5">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span>
                                {testResult.error ||
                                    `HTTP ${testResult.status}`}
                            </span>
                        </div>
                    </div>
                )}

                {displayResponse !== null && (
                    <div className="col-span-2 space-y-1.5">
                        <Label className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                            {previewLabel}
                        </Label>
                        <pre className="max-h-64 overflow-auto rounded border bg-background px-3 py-2 font-mono text-xs leading-relaxed text-foreground">
                            {prettyResponse}
                        </pre>
                        {fresh ? (
                            <span className="flex items-center gap-1 text-[10px] font-medium text-success">
                                <CheckCircle2 className="h-3 w-3" />
                                HTTP 200 — JSON valide ({displayUrl})
                            </span>
                        ) : (
                            <span className="text-[10px] text-muted-foreground">
                                Réponse enregistrée — HTTP 200 ({displayUrl})
                            </span>
                        )}
                        {editUnchanged && (
                            <p className="text-[10px] text-muted-foreground">
                                Seul le nom a changé — vous pouvez enregistrer
                                sans test en direct réussi.
                            </p>
                        )}
                    </div>
                )}

                {displayResponse === null && !testResult && !testing && (
                    <p className="col-span-2 text-[10px] text-muted-foreground">
                        Le corps de la réponse est récupéré automatiquement — il
                        doit être HTTP 200 avec un JSON valide avant
                        l'enregistrement.
                    </p>
                )}
            </div>

            <DialogFooter>
                <Button variant="outline" onClick={onCancel} disabled={busy}>
                    Annuler
                </Button>
                <Button onClick={handleSubmit} disabled={!canSave}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {entry
                        ? 'Enregistrer les modifications'
                        : "Créer l'endpoint"}
                </Button>
            </DialogFooter>
        </>
    );
}

export function EndpointFormDialog({
    open,
    onOpenChange,
    entry,
    defaultRoot = '',
    busy = false,
    onSubmit,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entry?: EndpointEntry | null;
    defaultRoot?: string;
    busy?: boolean;
    onSubmit: (payload: EndpointPayload) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="font-mono text-sm tracking-wider uppercase">
                        {entry ? "Modifier l'endpoint" : 'Nouvel endpoint'}
                    </DialogTitle>
                </DialogHeader>

                <TestEndpointFields
                    key={entry?.id ?? 'new'}
                    entry={entry}
                    defaultRoot={defaultRoot}
                    busy={busy}
                    onCancel={() => onOpenChange(false)}
                    onSubmit={onSubmit}
                />
            </DialogContent>
        </Dialog>
    );
}
