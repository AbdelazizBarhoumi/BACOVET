import { AlertTriangle, Folder, Pencil, Sparkles, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { MeasureWizardDialog } from '@/components/pbi/MeasureWizardDialog';
import {
    MEASURES,
    measureError,
    type Field,
} from '@/lib/pbi/model';
import { usePbi } from '@/lib/pbi/store';
import { DaxDialog } from './dax';
import { Modal } from './modal';

export function ManageMeasuresDialog({ onClose }: { onClose: () => void }) {
    const { measures, removeMeasure } = usePbi();
    const [createOpen, setCreateOpen] = useState(false);
    const [wizardOpen, setWizardOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Field | null>(null);
    const [confirm, setConfirm] = useState<Field | null>(null);
    const [busy, setBusy] = useState(false);

    const items = useMemo(
        () => [
            ...MEASURES.filter((m) => !measures.some((c) => c.name === m.name)),
            ...measures,
        ],
        [measures],
    );

    const folders = useMemo(() => {
        const map = new Map<string, Field[]>();
        for (const m of items) {
            const key = m.category?.trim() || 'Sans catégorie';
            const arr = map.get(key) ?? [];
            arr.push(m);
            map.set(key, arr);
        }
        return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    }, [items]);

    const del = async (m: Field) => {
        if (busy || m.id == null) return;
        setBusy(true);
        try {
            await removeMeasure(m.id);
            toast.success(`Mesure « ${m.name} » supprimée`);
            setConfirm(null);
        } catch (e) {
            toast.error(
                e instanceof Error
                    ? e.message
                    : 'Échec de la suppression de la mesure',
            );
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal open onClose={onClose} title="Gérer les mesures" wide>
            <div className="p-4">
                <div className="mb-3 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                        Bibliothèque de mesures partagée — utilisable sur chaque
                        page.
                    </span>
                    <div className="flex overflow-hidden rounded border border-border">
                        <button
                            onClick={() => setWizardOpen(true)}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-brand hover:bg-brand/10"
                            title="Créer avec l'assistant guidé"
                        >
                            <Sparkles className="size-3.5" /> Assistant
                        </button>
                        <button
                            onClick={() => setCreateOpen(true)}
                            className="border-l border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent"
                            title="Saisir directement la formule DAX"
                        >
                            DAX
                        </button>
                    </div>
                </div>
                {folders.map(([folder, list]) => (
                    <div key={folder} className="mb-3">
                        <div className="flex items-center gap-1.5 px-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                            <Folder className="size-3.5" />
                            {folder}
                            <span className="text-muted-foreground/60">
                                ({list.length})
                            </span>
                        </div>
                        <ul className="mt-1 space-y-1">
                            {list.map((m) => {
                                const error = measureError(m.name);
                                const builtin = MEASURES.some(
                                    (b) => b.name === m.name,
                                );
                                return (
                                    <li
                                        key={m.name}
                                        className="flex items-center gap-2 rounded border border-border bg-background px-2 py-1.5"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="truncate font-mono text-[12px] font-semibold">
                                                    {m.name}
                                                </span>
                                                {builtin && (
                                                    <span className="shrink-0 text-[10px] text-muted-foreground">
                                                        Intégrée
                                                    </span>
                                                )}
                                                {error && (
                                                    <span
                                                        className="inline-flex min-w-0 shrink-0 items-center gap-1 truncate text-[10px] text-red-500"
                                                        title={error}
                                                    >
                                                        <AlertTriangle className="size-3 shrink-0" />
                                                        {error}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="truncate font-mono text-[11px] text-muted-foreground">
                                                {m.expression}
                                            </div>
                                            {m.description && (
                                                <div className="truncate text-[11px] text-muted-foreground/70">
                                                    {m.description}
                                                </div>
                                            )}
                                        </div>
                                        {!builtin && (
                                            <>
                                                <button
                                                    onClick={() =>
                                                        setEditTarget(m)
                                                    }
                                                    title="Modifier la mesure"
                                                    className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                                                >
                                                    <Pencil className="size-3.5" />
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        setConfirm(m)
                                                    }
                                                    title="Supprimer la mesure"
                                                    className="rounded p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </button>
                                            </>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
                {!items.length && (
                    <p className="py-6 text-center text-[12px] text-muted-foreground">
                        Aucune mesure pour l’instant — créez-en une avec «
                        DAX ».
                    </p>
                )}
            </div>
            {createOpen && <DaxDialog onClose={() => setCreateOpen(false)} />}
            {wizardOpen && (
                <MeasureWizardDialog onClose={() => setWizardOpen(false)} />
            )}
            {editTarget && (
                <DaxDialog
                    key={`edit-${editTarget.id ?? editTarget.name}`}
                    edit={editTarget}
                    onClose={() => setEditTarget(null)}
                />
            )}
            {confirm && (
                <Modal
                    open
                    onClose={() => setConfirm(null)}
                    title="Supprimer la mesure"
                >
                    <div className="p-4 text-[12px]">
                        <p>
                            Supprimer{' '}
                            <strong className="font-mono">
                                {confirm.name}
                            </strong>
                            ? Les visuels qui l’utilisent cesseront de se
                            résoudre tant qu’ils ne seront pas reliés à un autre
                            champ.
                        </p>
                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                onClick={() => setConfirm(null)}
                                className="rounded border border-border px-3 py-1 text-[12px]"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => del(confirm)}
                                disabled={busy}
                                className="rounded bg-red-600 px-3 py-1 text-[12px] font-medium text-white disabled:opacity-50"
                            >
                                Supprimer
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </Modal>
    );
}