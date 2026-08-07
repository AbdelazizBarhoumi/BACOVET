import { useState } from 'react';
import { toast } from 'sonner';
import { formatNumber, type Row } from '@/lib/pbi/model';
import { usePbi } from '@/lib/pbi/store';
import { cn } from '@/lib/utils';
import { Modal } from './modal';

type Step = { label: string };

export function PowerQueryDialog({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const { tables } = usePbi();
    const [tab, setTab] = useState('Accueil');
    const [table, setTable] = useState('');
    const [steps, setSteps] = useState<Step[]>([
        { label: 'Source' },
        { label: 'Navigation' },
        { label: 'Type modifié' },
    ]);
    const [hidden, setHidden] = useState<string[]>([]);
    const [sortCol, setSortCol] = useState<string | null>(null);

    const def = tables.find((t) => t.name === table) ?? tables[0];
    const columns = (def?.fields ?? [])
        .map((f) => f.name)
        .filter((c) => !hidden.includes(c));

    const rows: Row[] = (() => {
        if (!def) return [];
        const data = [...def.rows].slice(0, 400);
        if (sortCol)
            data.sort((a, b) =>
                String(a[sortCol]).localeCompare(String(b[sortCol])),
            );
        return data.slice(0, 200);
    })();

    const addStep = (label: string) => {
        setSteps((s) => [...s, { label }]);
        toast.success(`Étape appliquée : ${label}`);
    };

    const RIBBON: Record<string, { label: string; run: () => void }[]> = {
        Accueil: [
            {
                label: 'Actualiser l’aperçu',
                run: () => addStep('Aperçu actualisé'),
            },
            {
                label: 'Choisir les colonnes',
                run: () => addStep('Autres colonnes supprimées'),
            },
            {
                label: 'Supprimer les colonnes',
                run: () => {
                    const last = columns[columns.length - 1];
                    if (last) {
                        setHidden((h) => [...h, last]);
                        addStep(`Colonnes supprimées (${last})`);
                    }
                },
            },
            {
                label: 'Conserver les lignes',
                run: () => addStep('Premières lignes conservées'),
            },
            {
                label: 'Fusionner les requêtes',
                run: () => addStep('Requêtes fusionnées'),
            },
            {
                label: 'Ajouter des requêtes',
                run: () => addStep('Requête ajoutée'),
            },
        ],
        Transformer: [
            { label: 'Grouper par', run: () => addStep('Lignes groupées') },
            {
                label: 'Utiliser la 1re ligne comme en-têtes',
                run: () => addStep('En-têtes promus'),
            },
            { label: 'Transposer', run: () => addStep('Tableau transposé') },
            {
                label: 'Faire pivoter la colonne',
                run: () => addStep('Colonne pivotée'),
            },
            {
                label: 'Dépivoter les colonnes',
                run: () => addStep('Colonnes dépivotées'),
            },
            {
                label: 'Remplacer les valeurs',
                run: () => addStep('Valeur remplacée'),
            },
            {
                label: 'Fractionner la colonne',
                run: () => addStep('Colonne fractionnée par délimiteur'),
            },
        ],
        'Ajouter une colonne': [
            {
                label: 'Colonne personnalisée',
                run: () => addStep('Colonne personnalisée ajoutée'),
            },
            {
                label: 'Colonne conditionnelle',
                run: () => addStep('Colonne conditionnelle ajoutée'),
            },
            { label: 'Colonne d’index', run: () => addStep('Index ajouté') },
            {
                label: 'Dupliquer la colonne',
                run: () => addStep('Colonne dupliquée'),
            },
            { label: 'Extraire l’année', run: () => addStep('Année insérée') },
        ],
        Affichage: [
            {
                label: 'Barre de formule',
                run: () => toast.info('Barre de formule activée/désactivée'),
            },
            {
                label: 'Éditeur avancé',
                run: () =>
                    toast.info(
                        `let Source = ${def?.name ?? 'Requête'} in Source`,
                    ),
            },
            {
                label: 'Dépendances des requêtes',
                run: () =>
                    toast.info(
                        tables.map((t) => t.name).join(' → ') ||
                            'Aucune requête',
                    ),
            },
        ],
        Outils: [
            {
                label: 'Diagnostics de requête',
                run: () => toast.info('Session de diagnostics démarrée'),
            },
            { label: 'Options', run: () => toast.info('Options de requête') },
        ],
    };

    return (
        <Modal open={open} onClose={onClose} title="Éditeur Power Query" wide>
            <div className="flex flex-col">
                <div className="flex border-b border-border bg-panel px-2 text-[12px]">
                    {Object.keys(RIBBON).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={cn(
                                'px-3 py-1.5',
                                tab === t
                                    ? 'border-b-2 border-brand font-semibold'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {t}
                        </button>
                    ))}
                </div>
                <div className="flex flex-wrap gap-1 border-b border-border bg-ribbon p-2">
                    {(RIBBON[tab] ?? []).map((b) => (
                        <button
                            key={b.label}
                            onClick={b.run}
                            className="rounded border border-border bg-card px-2 py-1 text-[11px] hover:bg-accent"
                        >
                            {b.label}
                        </button>
                    ))}
                </div>
                <div className="grid grid-cols-[150px_1fr_210px]">
                    <div className="border-r border-border p-2">
                        <div className="mb-1 text-[11px] font-semibold">
                            Requêtes
                        </div>
                        {tables.map((t) => (
                            <button
                                key={t.name}
                                onClick={() => setTable(t.name)}
                                className={cn(
                                    'block w-full truncate rounded px-2 py-1 text-left text-[11px] hover:bg-accent',
                                    table === t.name && 'bg-accent font-medium',
                                )}
                            >
                                {t.name}
                            </button>
                        ))}
                        {!tables.length && (
                            <p className="text-[11px] text-muted-foreground">
                                Aucun jeu de données chargé.
                            </p>
                        )}
                    </div>
                    <div className="max-h-[45vh] overflow-auto">
                        {!def ? (
                            <p className="p-3 text-[11px] text-muted-foreground">
                                Aucune donnée à prévisualiser.
                            </p>
                        ) : (
                            <table className="w-full border-collapse text-[11px]">
                                <thead className="sticky top-0 bg-muted">
                                    <tr>
                                        {columns.map((c) => (
                                            <th
                                                key={c}
                                                onClick={() => setSortCol(c)}
                                                className="cursor-pointer border-r border-b border-border px-2 py-1 text-left font-semibold whitespace-nowrap hover:bg-accent"
                                            >
                                                {c}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r, i) => (
                                        <tr key={i} className="hover:bg-accent">
                                            {columns.map((c) => (
                                                <td
                                                    key={c}
                                                    className="border-r border-b border-border px-2 py-[3px] whitespace-nowrap"
                                                >
                                                    {typeof r[c] === 'number'
                                                        ? formatNumber(
                                                              Number(r[c]),
                                                              false,
                                                          )
                                                        : String(r[c] ?? '')}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                    <div className="border-l border-border p-2">
                        <div className="mb-1 text-[11px] font-semibold">
                            Étapes appliquées
                        </div>
                        {steps.map((s, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between rounded px-2 py-1 text-[11px] hover:bg-accent"
                            >
                                <span className="truncate">{s.label}</span>
                                {i > 2 && (
                                    <button
                                        onClick={() =>
                                            setSteps((x) =>
                                                x.filter((_, j) => j !== i),
                                            )
                                        }
                                        className="text-muted-foreground hover:text-destructive"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-border bg-panel px-3 py-2">
                    <button
                        onClick={onClose}
                        className="rounded border border-border px-3 py-1 text-[12px]"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={() => {
                            toast.success('Modifications appliquées au modèle');
                            onClose();
                        }}
                        className="rounded bg-brand px-3 py-1 text-[12px] font-medium text-brand-foreground"
                    >
                        Fermer et appliquer
                    </button>
                </div>
            </div>
        </Modal>
    );
}