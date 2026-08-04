import { LayoutGrid, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    createBoard,
    createColumn,
    deleteBoard,
    listBoards,
    moveCard,
    reorderColumns,
    updateBoard,
    type KanbanBoard,
} from "@/services/kanbanApi";
import type { DragState } from "./KanbanCard";
import { KanbanColumnItem } from "./KanbanColumn";

type HoverTarget = { columnId: number; index: number; cardId: number | null };

export function KanbanBoardPage() {
    const [boards, setBoards] = useState<KanbanBoard[]>([]);
    const [boardId, setBoardId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    const [drag, setDrag] = useState<DragState | null>(null);
    const [hover, setHover] = useState<HoverTarget | null>(null);

    const [columnDrag, setColumnDrag] = useState<number | null>(null);
    const [columnHoverIndex, setColumnHoverIndex] = useState<number | null>(null);

    const [creatingBoard, setCreatingBoard] = useState(false);
    const [renamingBoard, setRenamingBoard] = useState(false);
    const [addingColumn, setAddingColumn] = useState(false);
    const [name, setName] = useState("");
    const [busy, setBusy] = useState(false);

    const board = boards.find((b) => b.id === boardId) ?? boards[0] ?? null;

    const refresh = useCallback(async (silent = false) => {
        try {
            const data = await listBoards();
            setBoards(data);
            setBoardId((cur) =>
                cur && data.some((b) => b.id === cur)
                    ? cur
                    : (data[0]?.id ?? null),
            );
        } catch (err) {
            if (!silent) {
                toast.error((err as Error).message || "Impossible de charger les tableaux");
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const dragRef = useRef(false);
    useEffect(() => {
        dragRef.current = !!drag || columnDrag != null;
    }, [drag, columnDrag]);

    useEffect(() => {
        const timer = setInterval(() => {
            if (!dragRef.current) {
                void refresh(true);
            }
        }, 3000);
        return () => clearInterval(timer);
    }, [refresh]);

    const boardIndex = useCallback(
        (columnId: number, cardId: number) => {
            const col = board?.columns.find((c) => c.id === columnId);
            if (!col) return 0;
            return col.cards.findIndex((c) => c.id === cardId);
        },
        [board],
    );

    const computeHoverIndex = (
        columnId: number,
        cardId: number,
        e: React.DragEvent,
    ): number => {
        const el = e.currentTarget as HTMLElement;
        const rect = el.getBoundingClientRect();
        const before = e.clientY < rect.top + rect.height / 2;
        const idx = boardIndex(columnId, cardId);
        return before ? idx : idx + 1;
    };

    const boardColumnIdOf = useCallback(
        (cardId: number) => {
            const col = board?.columns.find((c) =>
                c.cards.some((card) => card.id === cardId),
            );
            return col?.id ?? null;
        },
        [board],
    );

    const handleDragOverCard = (
        columnId: number,
        cardId: number,
        e: React.DragEvent,
    ) => {
        if (!drag) return;
        e.preventDefault();
        e.stopPropagation();
        setHover({
            columnId,
            index: computeHoverIndex(columnId, cardId, e),
            cardId,
        });
    };

    const handleDropOnCard = (cardId: number, e: React.DragEvent) => {
        if (!drag) return;
        const columnId = boardColumnIdOf(cardId);
        if (columnId == null) return;
        const index = computeHoverIndex(columnId, cardId, e);
        void performMove(drag, { columnId, index, cardId });
    };

    const handleDropOnColumn = (e: React.DragEvent, columnId: number) => {
        if (!drag) return;
        const col = board?.columns.find((c) => c.id === columnId);
        const index = col ? col.cards.length : 0;
        void performMove(drag, { columnId, index, cardId: null });
    };

    const performMove = async (state: DragState, target: HoverTarget) => {
        setDrag(null);
        setHover(null);
        try {
            await moveCard(state.cardId, target.columnId, target.index);
            await refresh();
        } catch (err) {
            toast.error((err as Error).message || "Erreur lors du déplacement");
        }
    };

    const handleDragStart = (cardId: number, columnId: number, e: React.DragEvent) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(cardId));
        setDrag({ cardId, fromColumnId: columnId });
    };

    const handleDragEnd = () => {
        setDrag(null);
        setHover(null);
    };

    const handleColumnDragStart = (columnId: number, e: React.DragEvent) => {
        if (drag) return;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(columnId));
        setColumnDrag(columnId);
    };

    const handleColumnDragOver = (columnId: number, e: React.DragEvent) => {
        if (columnDrag == null) return;
        e.preventDefault();
        const el = e.currentTarget as HTMLElement;
        const rect = el.getBoundingClientRect();
        const before = e.clientX < rect.left + rect.width / 2;
        const idx = board?.columns.findIndex((c) => c.id === columnId) ?? 0;
        setColumnHoverIndex(before ? idx : idx + 1);
    };

    const handleColumnDragEnd = () => {
        setColumnDrag(null);
        setColumnHoverIndex(null);
    };

    const handleColumnDrop = async () => {
        if (columnDrag == null || columnHoverIndex == null || !board) return;
        const from = board.columns.findIndex((c) => c.id === columnDrag);
        if (from < 0) return;
        const columns = [...board.columns];
        const [moved] = columns.splice(from, 1);
        let to = columnHoverIndex;
        if (from < to) to -= 1;
        columns.splice(Math.max(0, Math.min(to, columns.length)), 0, moved);
        setColumnDrag(null);
        setColumnHoverIndex(null);
        try {
            await reorderColumns(columns.map((c) => c.id));
            await refresh();
        } catch (err) {
            toast.error((err as Error).message || "Erreur de réorganisation");
        }
    };

    const handleCreateBoard = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setBusy(true);
        try {
            const created = await createBoard(name.trim());
            await refresh();
            setBoardId(created.id);
            setName("");
            setCreatingBoard(false);
            toast.success("Tableau créé");
        } catch (err) {
            toast.error((err as Error).message || "Erreur de création");
        } finally {
            setBusy(false);
        }
    };

    const handleRenameBoard = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!board || !name.trim()) return;
        setBusy(true);
        try {
            await updateBoard(board.id, name.trim());
            await refresh();
            setRenamingBoard(false);
            toast.success("Tableau renommé");
        } catch (err) {
            toast.error((err as Error).message || "Erreur de renommage");
        } finally {
            setBusy(false);
        }
    };

    const handleAddColumn = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!board || !name.trim()) return;
        setBusy(true);
        try {
            await createColumn(board.id, name.trim());
            await refresh();
            setName("");
            setAddingColumn(false);
            toast.success("Colonne ajoutée");
        } catch (err) {
            toast.error((err as Error).message || "Erreur de création");
        } finally {
            setBusy(false);
        }
    };

    const handleDeleteBoard = async () => {
        if (!board) return;
        setBusy(true);
        try {
            await deleteBoard(board.id);
            await refresh();
            toast.success("Tableau supprimé");
        } catch (err) {
            toast.error((err as Error).message || "Erreur de suppression");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="flex h-screen flex-col bg-background text-foreground">
            {/* Header */}
            <header className="flex items-center gap-3 border-b border-border px-4 py-2.5">
                <div className="flex items-center gap-2">
                    <LayoutGrid className="h-5 w-5 text-primary" />
                    <h1 className="text-base font-semibold">Kanban</h1>
                </div>
                <select
                    value={boardId ?? ""}
                    onChange={(e) => setBoardId(Number(e.target.value))}
                    disabled={loading || boards.length === 0}
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm outline-none focus:border-primary disabled:opacity-50"
                >
                    {boards.map((b) => (
                        <option key={b.id} value={b.id}>
                            {b.name}
                        </option>
                    ))}
                </select>
                <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => setCreatingBoard(true)}>
                        <Plus className="h-4 w-4" />
                        Tableau
                    </Button>
                    {board && (
                        <>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setName(board.name);
                                    setRenamingBoard(true);
                                }}
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleDeleteBoard}
                                disabled={busy}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </>
                    )}
                </div>
                <div className="flex-1" />
                {board && (
                    <Button size="sm" onClick={() => setAddingColumn(true)}>
                        <Plus className="h-4 w-4" />
                        Colonne
                    </Button>
                )}
            </header>

            {/* Board body */}
            <div className="flex-1 overflow-hidden">
                {loading ? (
                    <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                ) : !board ? (
                    <div className="flex h-full flex-col items-center justify-center gap-3">
                        <p className="text-sm text-muted-foreground">
                            Aucun tableau. Créez-en un pour commencer.
                        </p>
                        <Button onClick={() => setCreatingBoard(true)}>
                            <Plus className="h-4 w-4" />
                            Créer un tableau
                        </Button>
                    </div>
                ) : (
                    <div className="flex h-full items-start gap-3 overflow-x-auto p-4">
                        {board.columns.length === 0 && (
                            <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/70 px-8 text-sm text-muted-foreground">
                                Aucune colonne. Ajoutez votre première colonne.
                                <Button onClick={() => setAddingColumn(true)}>
                                    <Plus className="h-4 w-4" />
                                    Ajouter une colonne
                                </Button>
                            </div>
                        )}
                        {board.columns.map((column) => (
                            <KanbanColumnItem
                                key={column.id}
                                column={column}
                                drag={drag}
                                dragOverCardId={
                                    hover && hover.columnId === column.id
                                        ? hover.cardId
                                        : null
                                }
                                isColumnDragging={columnDrag === column.id}
                                isColumnDropTarget={
                                    columnDrag != null &&
                                    columnHoverIndex != null &&
                                    (column.id ===
                                        board.columns[
                                            Math.max(
                                                0,
                                                Math.min(
                                                    columnHoverIndex - (columnDrag < columnHoverIndex ? 1 : 0),
                                                    board.columns.length - 1,
                                                ),
                                            )
                                        ]?.id ||
                                        columnHoverIndex === 0)
                                }
                                onColumnDragStart={(e) =>
                                    handleColumnDragStart(column.id, e)
                                }
                                onColumnDragOver={(e) =>
                                    handleColumnDragOver(column.id, e)
                                }
                                onColumnDragEnd={handleColumnDragEnd}
                                onColumnDrop={handleColumnDrop}
                                onDragOverCard={(cardId, e) =>
                                    handleDragOverCard(column.id, cardId, e)
                                }
                                onDragStartCard={(cardId, e) =>
                                    handleDragStart(cardId, column.id, e)
                                }
                                onDropOnCard={(cardId, e) =>
                                    handleDropOnCard(cardId, e)
                                }
                                onDropOnColumn={(e, columnId) =>
                                    handleDropOnColumn(e, columnId)
                                }
                                onDragEnd={handleDragEnd}
                                onChanged={refresh}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Dialogs */}
            <Dialog open={creatingBoard} onOpenChange={setCreatingBoard}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Nouveau tableau</DialogTitle>
                        <DialogDescription>
                            Créez un nouveau tableau kanban.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateBoard} className="space-y-3">
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nom du tableau"
                            autoFocus
                            required
                        />
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCreatingBoard(false)}
                            >
                                Annuler
                            </Button>
                            <Button type="submit" disabled={busy || !name.trim()}>
                                {busy ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : null}
                                Créer
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={renamingBoard} onOpenChange={setRenamingBoard}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Renommer le tableau</DialogTitle>
                        <DialogDescription>Modifiez le nom du tableau.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleRenameBoard} className="space-y-3">
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nom du tableau"
                            autoFocus
                            required
                        />
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setRenamingBoard(false)}
                            >
                                Annuler
                            </Button>
                            <Button type="submit" disabled={busy || !name.trim()}>
                                {busy ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : null}
                                Enregistrer
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={addingColumn} onOpenChange={setAddingColumn}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Nouvelle colonne</DialogTitle>
                        <DialogDescription>
                            Ajoutez une colonne au tableau « {board?.name} ».
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddColumn} className="space-y-3">
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nom de la colonne"
                            autoFocus
                            required
                        />
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setAddingColumn(false)}
                            >
                                Annuler
                            </Button>
                            <Button type="submit" disabled={busy || !name.trim()}>
                                {busy ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : null}
                                Ajouter
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
