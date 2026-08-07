import { useState } from 'react';
import { toast } from 'sonner';
import { mkVisual, usePbi, wf } from '@/lib/pbi/store';
import { Modal } from './modal';

export function QnaDialog({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const { setState, activePageId, tables } = usePbi();
    const [q, setQ] = useState('');

    const primary = tables[0];
    const textCols = (primary?.fields ?? []).filter(
        (f) => f.type === 'text' || f.type === 'date',
    );
    const numCols = (primary?.fields ?? []).filter((f) => f.type === 'number');
    const suggestBy = textCols[0]?.name;
    const suggestVal = numCols[0]?.name;
    const suggestions =
        suggestBy && suggestVal
            ? [
                  `${suggestVal} par ${suggestBy}`,
                  `somme de ${suggestVal} par ${suggestBy}`,
                  `moyenne de ${suggestVal} par ${suggestBy}`,
                  `nombre de ${suggestBy}`,
              ]
            : [];

    const run = () => {
        if (!primary || !suggestBy || !suggestVal) {
            toast.error('Aucun jeu de données chargé');
            return;
        }
        const text = q.toLowerCase();
        const by =
            textCols.find((f) => text.includes(f.name.toLowerCase()))?.name ??
            suggestBy;
        const measure =
            numCols.find((f) => text.includes(f.name.toLowerCase()))?.name ??
            suggestVal;
        const type: 'donut' | 'line' | 'column' =
            text.includes('share') || text.includes('pie')
                ? 'donut'
                : text.includes('trend') || text.includes('month')
                  ? 'line'
                  : 'column';

        const visual = mkVisual(type, 0, 0, 6, 4, {
            title: `${measure} par ${by}`,
            axis: [wf(by, primary.name)],
            values: [wf(measure, primary.name)],
        });
        setState((s) => ({
            ...s,
            pages: s.pages.map((p) =>
                p.id === activePageId
                    ? { ...p, visuals: [...p.visuals, visual] }
                    : p,
            ),
            selectedId: visual.id,
        }));
        toast.success('Visuel Q&A créé', {
            description: `${measure} par ${by}`,
        });
        onClose();
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Q&A — posez une question sur vos données"
        >
            <div className="space-y-3 p-4">
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="w-full rounded border border-border bg-background px-3 py-2 text-[13px]"
                    placeholder={
                        suggestBy && suggestVal
                            ? `p. ex. ${suggestVal} par ${suggestBy}`
                            : 'Aucun jeu de données chargé'
                    }
                />
                <div className="flex flex-wrap gap-1 text-[11px]">
                    {suggestions.map((s) => (
                        <button
                            key={s}
                            onClick={() => setQ(s)}
                            className="rounded-full border border-border px-2 py-0.5 hover:bg-accent"
                        >
                            {s}
                        </button>
                    ))}
                </div>
                <div className="flex justify-end">
                    <button
                        onClick={run}
                        className="rounded bg-brand px-3 py-1 text-[12px] font-medium text-brand-foreground"
                    >
                        Créer le visuel
                    </button>
                </div>
            </div>
        </Modal>
    );
}