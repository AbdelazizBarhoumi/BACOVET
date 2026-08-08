import {
    ChevronRight,
    Folder,
    MoreHorizontal,
    Pencil,
    Plus,
    Search,
    Sigma,
    Sparkles,
    Table2,
    Trash2,
    TriangleAlert,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { MEASURES, measureError, type Field } from '@/lib/pbi/model';
import { defaultDropWell, usePbi, type WellName } from '@/lib/pbi/store';
import { isSingleValueType } from '@/lib/pbi/visualConfig';
import { cn } from '@/lib/utils';
import { DaxDialog, ManageMeasuresDialog } from '../Dialogs';
import { MeasureWizardDialog } from '../MeasureWizardDialog';
import {
    IconFieldBoolean,
    IconFieldDate,
    IconFieldNumber,
    IconFieldText,
} from './icons';
import {
    DEFAULT_FOLDER_LABELS,
    MeasureDropdown,
    PaneHeader,
    type AnchorRect,
} from './shared';

export function FieldsPane({ onCollapse }: { onCollapse?: () => void }) {
    const {
        addFilter,
        selected,
        toggleField,
        tables,
        measures,
        removeMeasure,
        updateMeasure,
    } = usePbi();
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState<Record<string, boolean>>({});
    const [folderOpen, setFolderOpen] = useState<Record<string, boolean>>({});
    const [menuFor, setMenuFor] = useState<{
        name: string;
        rect: AnchorRect;
    } | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [editTarget, setEditTarget] = useState<Field | null>(null);
    const [manageOpen, setManageOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [folderMenuFor, setFolderMenuFor] = useState<{
        folder: string;
        rect: AnchorRect;
    } | null>(null);
    const [createCategory, setCreateCategory] = useState<string | null>(null);
    const [wizardCategory, setWizardCategory] = useState<string | null>(null);
    const [renameTarget, setRenameTarget] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [confirmFolderDelete, setConfirmFolderDelete] = useState<
        string | null
    >(null);
    const skipRenameBlur = useRef(false);

    const custom = useMemo(() => measures ?? [], [measures]);
    const measureFields = useMemo(
        () => [
            ...MEASURES.filter((m) => !custom.some((c) => c.name === m.name)),
            ...custom,
        ],
        [custom],
    );

    const folderLabel = (folder: string) =>
        DEFAULT_FOLDER_LABELS[folder] ?? folder;

    const measureFolders = useMemo(() => {
        const map = new Map<string, Field[]>();
        for (const m of measureFields) {
            const key = m.category?.trim() || 'Other';
            const arr = map.get(key) ?? [];
            arr.push(m);
            map.set(key, arr);
        }
        return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    }, [measureFields]);

    const del = async (name: string) => {
        const target = custom.find((m) => m.name === name);
        if (busy || !target || target.id == null) return;
        setBusy(true);
        try {
            await removeMeasure(target.id);
            toast.success(`Mesure « ${name} » supprimée`);
            setConfirmDelete(null);
            setMenuFor(null);
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

    const customIn = (list: Field[]) => list.filter((m) => m.id != null);

    const renameFolder = async (oldName: string) => {
        if (skipRenameBlur.current) {
            skipRenameBlur.current = false;
            return;
        }
        const newName = renameValue.trim();
        setRenameTarget(null);
        setFolderMenuFor(null);
        if (!newName || newName === oldName) return;
        const target = customIn(
            measureFields.filter(
                (m) => (m.category?.trim() || 'Other') === oldName,
            ),
        );
        if (!target.length) {
            toast.error('Impossible de renommer ce dossier');
            return;
        }
        setBusy(true);
        try {
            await Promise.all(
                target.map((m) =>
                    updateMeasure(
                        m.id!,
                        m.name,
                        m.expression ?? '',
                        newName,
                        m.description ?? null,
                    ),
                ),
            );
            toast.success(`Dossier « ${oldName} » renommé en « ${newName} »`);
            setFolderOpen((o) => {
                const rest = { ...o };
                delete rest[oldName];
                return { ...rest, [newName]: o[oldName] ?? false };
            });
        } catch (e) {
            toast.error(
                e instanceof Error
                    ? e.message
                    : 'Échec du renommage du dossier',
            );
        } finally {
            setBusy(false);
        }
    };

    const deleteFolder = async (name: string) => {
        const target = customIn(
            measureFields.filter(
                (m) => (m.category?.trim() || 'Other') === name,
            ),
        );
        if (!target.length) return;
        setBusy(true);
        try {
            await Promise.all(
                target.map((m) =>
                    updateMeasure(
                        m.id!,
                        m.name,
                        m.expression ?? '',
                        null,
                        m.description ?? null,
                    ),
                ),
            );
            toast.success(`Dossier « ${name} » supprimé — mesures déplacées`);
            setFolderMenuFor(null);
            setConfirmFolderDelete(null);
        } catch (e) {
            toast.error(
                e instanceof Error
                    ? e.message
                    : 'Échec de la suppression du dossier',
            );
        } finally {
            setBusy(false);
        }
    };

    const measureChecked = (f: Field) =>
        !!selected &&
        [...selected.axis, ...selected.values, ...selected.legend].some(
            (x) => x.name === f.name && x.table === 'Measures',
        );

    const targetWell = (f: Field): WellName => {
        if (!selected) return 'values';
        if (isSingleValueType(selected.type)) return 'values';
        return defaultDropWell(selected.type) === 'axis'
            ? 'axis'
            : f.measure || f.type === 'number'
              ? 'values'
              : 'axis';
    };

    const toggleMeasure = (f: Field) => {
        if (!selected) return;
        toggleField(selected.id, targetWell(f), f.name, 'Measures');
    };

    const groups = tables.map((t) => ({ name: t.name, fields: t.fields }));

    return (
        <div className="flex h-full flex-col">
            <PaneHeader title="Données" onCollapse={onCollapse} />
            <div className="px-2 pb-2">
                <div className="flex items-center gap-1 rounded border border-border bg-background px-2">
                    <Search className="size-3 text-muted-foreground" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Rechercher"
                        className="w-full bg-transparent py-1 text-[11px] placeholder:text-muted-foreground/50 outline-none"
                    />
                </div>
            </div>
            <div className="flex-1 overflow-auto px-1 pb-2">
                {measureFields.length > 0 && (
                    <div key="Measures">
                        <div className="flex items-center">
                            <button
                                onClick={() =>
                                    setOpen((o) => ({
                                        ...o,
                                        Measures: !o.Measures,
                                    }))
                                }
                                className="flex w-full items-center gap-1 rounded px-1 py-1 text-[12px] font-medium hover:bg-accent"
                            >
                                <ChevronRight
                                    className={cn(
                                        'size-3 transition-transform',
                                        open.Measures && 'rotate-90',
                                    )}
                                />
                                <Sigma className="size-3 text-muted-foreground" />
                                <span className="truncate">Mesures</span>
                            </button>
                            <button
                                onClick={() => setManageOpen(true)}
                                title="Gérer les mesures"
                                className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent"
                            >
                                <MoreHorizontal className="size-3.5" />
                            </button>
                        </div>
                        {open.Measures &&
                            measureFolders.map(([folder, list]) => {
                                const visible = list.filter((f) =>
                                    [f.name, folder, f.expression ?? ''].some(
                                        (value) =>
                                            value
                                                .toLowerCase()
                                                .includes(query.toLowerCase()),
                                    ),
                                );
                                if (!visible.length) return null;
                                const isOther = folder === 'Other';
                                const named = !isOther;
                                return (
                                    <div key={folder} className="relative">
                                        <div className="ml-4 flex items-center">
                                            {renameTarget === folder ? (
                                                <input
                                                    autoFocus
                                                    value={renameValue}
                                                    onChange={(e) =>
                                                        setRenameValue(
                                                            e.target.value,
                                                        )
                                                    }
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            e.currentTarget.blur();
                                                        } else if (
                                                            e.key === 'Escape'
                                                        ) {
                                                            skipRenameBlur.current = true;
                                                            setRenameTarget(
                                                                null,
                                                            );
                                                            setFolderMenuFor(
                                                                null,
                                                            );
                                                        }
                                                    }}
                                                    onBlur={() =>
                                                        renameFolder(folder)
                                                    }
                                                    className="min-w-0 flex-1 rounded border border-brand bg-background px-1 py-[1px] text-[11px] text-foreground outline-none"
                                                />
                                            ) : (
                                                <button
                                                    onClick={() =>
                                                        setFolderOpen((o) => ({
                                                            ...o,
                                                            [folder]:
                                                                !o[folder],
                                                        }))
                                                    }
                                                    className="flex min-w-0 flex-1 items-center gap-1 rounded px-1 py-[2px] text-[11px] font-medium text-muted-foreground hover:bg-accent"
                                                >
                                                    <ChevronRight
                                                        className={cn(
                                                            'size-2.5 shrink-0 transition-transform',
                                                            folderOpen[
                                                                folder
                                                            ] && 'rotate-90',
                                                        )}
                                                    />
                                                    <Folder className="size-3 shrink-0 text-muted-foreground" />
                                                    <span className="truncate">
                                                        {folderLabel(folder)}
                                                    </span>
                                                    <span className="ml-auto shrink-0 pr-1 text-[10px] text-muted-foreground/60">
                                                        {visible.length}
                                                    </span>
                                                </button>
                                            )}
                                            {named && (
                                                <button
                                                    onClick={(e) => {
                                                        const r =
                                                            e.currentTarget.getBoundingClientRect();
                                                        setFolderMenuFor(
                                                            folderMenuFor?.folder ===
                                                                folder
                                                                ? null
                                                                : {
                                                                      folder,
                                                                      rect: {
                                                                          left: r.left,
                                                                          top: r.top,
                                                                          right: r.right,
                                                                          bottom: r.bottom,
                                                                      },
                                                                  },
                                                        );
                                                    }}
                                                    title="Actions du dossier"
                                                    className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-accent"
                                                >
                                                    <MoreHorizontal className="size-3.5" />
                                                </button>
                                            )}
                                        </div>
                                        {folderMenuFor?.folder === folder &&
                                            folderMenuFor && (
                                                <MeasureDropdown
                                                    rect={folderMenuFor.rect}
                                                    onClose={() =>
                                                        setFolderMenuFor(null)
                                                    }
                                                >
                                                    {confirmFolderDelete ===
                                                    folder ? (
                                                        <div className="px-2 py-1">
                                                            <p className="mb-1 text-muted-foreground">
                                                                Supprimer le
                                                                dossier{' '}
                                                                <span className="font-mono">
                                                                    {folderLabel(
                                                                        folder,
                                                                    )}
                                                                </span>{' '}
                                                                ? Les mesures
                                                                seront déplacées
                                                                dans « Sans
                                                                catégorie ».
                                                            </p>
                                                            <div className="flex justify-end gap-1">
                                                                <button
                                                                    onClick={() =>
                                                                        setConfirmFolderDelete(
                                                                            null,
                                                                        )
                                                                    }
                                                                    className="rounded border border-border px-2 py-0.5"
                                                                >
                                                                    Non
                                                                </button>
                                                                <button
                                                                    onClick={() =>
                                                                        deleteFolder(
                                                                            folder,
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        busy
                                                                    }
                                                                    className="rounded bg-red-600 px-2 py-0.5 text-white disabled:opacity-50"
                                                                >
                                                                    Oui
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    setFolderMenuFor(
                                                                        null,
                                                                    );
                                                                    setCreateCategory(
                                                                        folder,
                                                                    );
                                                                    setFolderOpen(
                                                                        (
                                                                            o,
                                                                        ) => ({
                                                                            ...o,
                                                                            [folder]: true,
                                                                        }),
                                                                    );
                                                                }}
                                                                className="flex w-full items-center gap-2 px-2 py-1 hover:bg-accent"
                                                            >
                                                                <Plus className="size-3" />
                                                                Nouvelle mesure
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setFolderMenuFor(
                                                                        null,
                                                                    );
                                                                    setWizardCategory(
                                                                        folder,
                                                                    );
                                                                    setFolderOpen(
                                                                        (
                                                                            o,
                                                                        ) => ({
                                                                            ...o,
                                                                            [
                                                                                folder
                                                                            ]: true,
                                                                        }),
                                                                    );
                                                                }}
                                                                className="flex w-full items-center gap-2 px-2 py-1 hover:bg-accent"
                                                            >
                                                                <Sparkles className="size-3" />
                                                                Assistant
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setRenameValue(
                                                                        folder,
                                                                    );
                                                                    setRenameTarget(
                                                                        folder,
                                                                    );
                                                                    setFolderMenuFor(
                                                                        null,
                                                                    );
                                                                }}
                                                                className="flex w-full items-center gap-2 px-2 py-1 hover:bg-accent"
                                                            >
                                                                <Pencil className="size-3" />
                                                                Renommer
                                                            </button>
                                                            <button
                                                                onClick={() =>
                                                                    setConfirmFolderDelete(
                                                                        folder,
                                                                    )
                                                                }
                                                                className="flex w-full items-center gap-2 px-2 py-1 text-red-500 hover:bg-accent"
                                                            >
                                                                <Trash2 className="size-3" />
                                                                Supprimer
                                                            </button>
                                                        </>
                                                    )}
                                                </MeasureDropdown>
                                            )}
                                        {folderOpen[folder] &&
                                            visible.map((f) => {
                                                const error = measureError(
                                                    f.name,
                                                );
                                                return (
                                                    <div
                                                        key={f.name}
                                                        className="relative"
                                                    >
                                                        <div
                                                            draggable
                                                            onDragStart={(
                                                                e,
                                                            ) => {
                                                                e.dataTransfer.setData(
                                                                    'text/plain',
                                                                    JSON.stringify(
                                                                        {
                                                                            table: 'Measures',
                                                                            name: f.name,
                                                                            measure: true,
                                                                        },
                                                                    ),
                                                                );
                                                                e.dataTransfer.effectAllowed =
                                                                    e.ctrlKey
                                                                        ? 'copy'
                                                                        : 'move';
                                                            }}
                                                            title={
                                                                f.expression ??
                                                                `[${f.name}]`
                                                            }
                                                            className="ml-5 flex cursor-grab items-center gap-2 rounded px-2 py-[3px] text-[11px] hover:bg-accent active:cursor-grabbing"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={measureChecked(
                                                                    f,
                                                                )}
                                                                onChange={() =>
                                                                    toggleMeasure(
                                                                        f,
                                                                    )
                                                                }
                                                                className="size-3 accent-[var(--brand)]"
                                                            />
                                                            <Sigma className="size-3 text-muted-foreground" />
                                                            <span className="truncate">
                                                                {f.name}
                                                            </span>
                                                            {error && (
                                                                <span
                                                                    className="shrink-0 text-red-500"
                                                                    title={
                                                                        error
                                                                    }
                                                                >
                                                                    <TriangleAlert className="size-3" />
                                                                </span>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                const r =
                                                                    e.currentTarget.getBoundingClientRect();
                                                                setMenuFor(
                                                                    menuFor?.name ===
                                                                        f.name
                                                                        ? null
                                                                        : {
                                                                              name: f.name,
                                                                              rect: {
                                                                                  left: r.left,
                                                                                  top: r.top,
                                                                                  right: r.right,
                                                                                  bottom: r.bottom,
                                                                              },
                                                                          },
                                                                );
                                                            }}
                                                            title="Actions de la mesure"
                                                            className="absolute top-1 right-1 z-10 rounded p-0.5 text-muted-foreground hover:bg-accent"
                                                        >
                                                            <MoreHorizontal className="size-3.5" />
                                                        </button>
                                                        {menuFor?.name ===
                                                            f.name &&
                                                            menuFor && (
                                                                <MeasureDropdown
                                                                    rect={
                                                                        menuFor.rect
                                                                    }
                                                                    width={160}
                                                                    onClose={() =>
                                                                        setMenuFor(
                                                                            null,
                                                                        )
                                                                    }
                                                                >
                                                                    {confirmDelete ===
                                                                    f.name ? (
                                                                        <div className="px-2 py-1">
                                                                            <p className="mb-1 text-muted-foreground">
                                                                                Supprimer{' '}
                                                                                <span className="font-mono">
                                                                                    {
                                                                                        f.name
                                                                                    }
                                                                                </span>{' '}
                                                                                ?
                                                                            </p>
                                                                            <div className="flex justify-end gap-1">
                                                                                <button
                                                                                    onClick={() =>
                                                                                        setConfirmDelete(
                                                                                            null,
                                                                                        )
                                                                                    }
                                                                                    className="rounded border border-border px-2 py-0.5"
                                                                                >
                                                                                    Non
                                                                                </button>
                                                                                <button
                                                                                    onClick={() =>
                                                                                        del(
                                                                                            f.name,
                                                                                        )
                                                                                    }
                                                                                    disabled={
                                                                                        busy
                                                                                    }
                                                                                    className="rounded bg-red-600 px-2 py-0.5 text-white disabled:opacity-50"
                                                                                >
                                                                                    Oui
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <>
                                                                            <button
                                                                                onClick={() => {
                                                                                    setEditTarget(
                                                                                        f,
                                                                                    );
                                                                                    setMenuFor(
                                                                                        null,
                                                                                    );
                                                                                }}
                                                                                className="flex w-full items-center gap-2 px-2 py-1 hover:bg-accent"
                                                                            >
                                                                                <Pencil className="size-3" />
                                                                                Modifier
                                                                            </button>
                                                                            <button
                                                                                onClick={() =>
                                                                                    setConfirmDelete(
                                                                                        f.name,
                                                                                    )
                                                                                }
                                                                                className="flex w-full items-center gap-2 px-2 py-1 text-red-500 hover:bg-accent"
                                                                            >
                                                                                <Trash2 className="size-3" />
                                                                                Supprimer
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </MeasureDropdown>
                                                            )}
                                                    </div>
                                                );
                                            })}
                                    </div>
                                );
                            })}
                    </div>
                )}
                {groups.map((g) => {
                    const fields = g.fields.filter((f) =>
                        [f.name, g.name, `${g.name}.${f.name}`].some((value) =>
                            value.toLowerCase().includes(query.toLowerCase()),
                        ),
                    );
                    if (!fields.length) return null;
                    return (
                        <div key={g.name}>
                            <button
                                onClick={() =>
                                    setOpen((o) => ({
                                        ...o,
                                        [g.name]: !o[g.name],
                                    }))
                                }
                                className="flex w-full items-center gap-1 rounded px-1 py-1 text-[12px] font-medium hover:bg-accent"
                            >
                                <ChevronRight
                                    className={cn(
                                        'size-3 transition-transform',
                                        open[g.name] && 'rotate-90',
                                    )}
                                />
                                <Table2 className="size-3 text-muted-foreground" />
                                <span className="truncate">{g.name}</span>
                            </button>
                            {open[g.name] &&
                                fields.map((f) => (
                                    <div
                                        key={`${g.name}.${f.name}`}
                                        draggable
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData(
                                                'text/plain',
                                                JSON.stringify({
                                                    table: g.name,
                                                    name: f.name,
                                                    measure: !!f.measure,
                                                }),
                                            );
                                            // Ctrl+drag duplicates a field into another bucket
                                            e.dataTransfer.effectAllowed =
                                                e.ctrlKey ? 'copy' : 'move';
                                        }}
                                        onDoubleClick={() =>
                                            !f.measure &&
                                            addFilter(f.name, g.name)
                                        }
                                        title={
                                            f.expression ??
                                            `${f.table}[${f.name}]`
                                        }
                                        className="ml-5 flex cursor-grab items-center gap-2 rounded px-2 py-[3px] text-[11px] hover:bg-accent active:cursor-grabbing"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={
                                                !!selected &&
                                                [
                                                    ...selected.axis,
                                                    ...selected.values,
                                                    ...selected.legend,
                                                ].some(
                                                    (x) =>
                                                        x.name === f.name &&
                                                        x.table === g.name,
                                                )
                                            }
                                            onChange={() => {
                                                if (!selected) return;
                                                toggleField(
                                                    selected.id,
                                                    targetWell(f),
                                                    f.name,
                                                    g.name,
                                                );
                                            }}
                                            className="size-3 accent-[var(--brand)]"
                                        />
                                        {f.measure ? (
                                            <Sigma className="size-3 text-muted-foreground" />
                                        ) : f.type === 'number' ? (
                                            <IconFieldNumber className="size-3 text-green-600" />
                                        ) : f.type === 'date' ? (
                                            <IconFieldDate className="size-3 text-violet-600" />
                                        ) : f.type === 'boolean' ? (
                                            <IconFieldBoolean className="size-3 text-sky-500" />
                                        ) : (
                                            <IconFieldText className="size-3 text-orange-500" />
                                        )}
                                        <span className="truncate">
                                            {tables.some(
                                                (table) =>
                                                    table.name !== g.name &&
                                                    table.fields.some(
                                                        (field) =>
                                                            field.name ===
                                                            f.name,
                                                    ),
                                            )
                                                ? `${g.name}.${f.name}`
                                                : f.name}
                                        </span>
                                    </div>
                                ))}
                        </div>
                    );
                })}
            </div>
            {manageOpen && (
                <ManageMeasuresDialog onClose={() => setManageOpen(false)} />
            )}
            {editTarget && (
                <DaxDialog
                    key={`edit-${editTarget.id ?? editTarget.name}`}
                    edit={editTarget}
                    onClose={() => setEditTarget(null)}
                />
            )}
            {createCategory !== null && (
                <DaxDialog
                    key={`new-${createCategory}`}
                    createCategory={createCategory}
                    onClose={() => setCreateCategory(null)}
                />
            )}
            {wizardCategory !== null && (
                <MeasureWizardDialog
                    key={`wizard-${wizardCategory}`}
                    createCategory={wizardCategory}
                    onClose={() => setWizardCategory(null)}
                />
            )}
        </div>
    );
}