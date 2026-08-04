import { GripVertical, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
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
    createCard,
    deleteColumn,
    updateColumn,
    type KanbanColumn,
} from "@/services/kanbanApi";
import { KanbanCardItem, type DragState } from "./KanbanCard";

export function KanbanColumnItem({
    column,
    drag,
    dragOverCardId,
    isColumnDragging,
    isColumnDropTarget,
    onColumnDragStart,
    onColumnDragOver,
    onColumnDragEnd,
    onColumnDrop,
    onDragOverCard,
    onDragStartCard,
    onDropOnCard,
    onDropOnColumn,
    onDragEnd,
    onChanged,
}: {
    column: KanbanColumn;
    drag: DragState | null;
    dragOverCardId: number | null;
    isColumnDragging: boolean;
    isColumnDropTarget: boolean;
    onColumnDragStart: (e: React.DragEvent) => void;
    onColumnDragOver: (e: React.DragEvent) => void;
    onColumnDragEnd: () => void;
    onColumnDrop: () => void;
    onDragOverCard: (cardId: number, e: React.DragEvent) => void;
    onDragStartCard: (cardId: number, e: React.DragEvent) => void;
    onDropOnCard: (cardId: number, e: React.DragEvent) => void;
    onDropOnColumn: (e: React.DragEvent, columnId: number) => void;
    onDragEnd: () => void;
    onChanged: () => void;
}) {
    const [adding, setAdding] = useState(false);
    const [renaming, setRenaming] = useState(false);
    const [name, setName] = useState("");
    const [busy, setBusy] = useState(false);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setBusy(true);
        try {
            await createCard(column.id, name.trim());
            toast.success("Carte ajoutée");
            setName("");
            setAdding(false);
            onChanged();
        } catch (err) {
            toast.error((err as Error).message || "Erreur de création");
        } finally {
            setBusy(false);
        }
    };

    const handleRename = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setBusy(true);
        try {
            await updateColumn(column.id, { name: name.trim() });
            toast.success("Colonne renommée");
            setRenaming(false);
            onChanged();
        } catch (err) {
            toast.error((err as Error).message || "Erreur de renommage");
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async () => {
        setBusy(true);
        try {
            await deleteColumn(column.id);
            toast.success("Colonne supprimée");
            onChanged();
        } catch (err) {
            toast.error((err as Error).message || "Erreur de suppression");
        } finally {
            setBusy(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        if (!drag) return;
        e.preventDefault();
        e.stopPropagation();
        onDropOnColumn(e, column.id);
    };

    const isDropTarget = !!drag && drag.fromColumnId !== column.id;
    const overCard = dragOverCardId !== null;

    return (
        <div
            draggable={!drag && isColumnDragging ? false : !drag}
            className={`flex w-72 shrink-0 flex-col rounded-lg border bg-muted/40 ${
                isDropTarget && !overCard ? "border-primary ring-1 ring-primary" : ""
            } ${isColumnDragging ? "opacity-40 ring-2 ring-primary" : ""} ${
                isColumnDropTarget ? "border-primary ring-1 ring-primary" : ""
            }`}
            onDragOver={(e) => {
                if (drag) e.preventDefault();
                else onColumnDragOver(e);
            }}
            onDragEnd={onColumnDragEnd}
            onDrop={(e) => {
                e.preventDefault();
                if (drag) handleDrop(e);
                else onColumnDrop();
            }}
        >
            <div className="flex items-center gap-1.5 px-3 py-2.5">
                <button
                    type="button"
                    title="Déplacer la colonne"
                    draggable={!drag}
                    onDragStart={(e) => {
                        e.stopPropagation();
                        onColumnDragStart(e);
                    }}
                    onDragOver={(e) => e.stopPropagation()}
                    className="flex h-6 w-6 cursor-grab items-center justify-center rounded text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground active:cursor-grabbing"
                >
                    <GripVertical className="h-4 w-4" />
                </button>
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
                    {column.cards.length}
                </span>
                <span className="flex-1 truncate text-xs font-semibold uppercase tracking-wide text-foreground">
                    {column.name}
                </span>
                <button
                    type="button"
                    title="Ajouter une carte"
                    onClick={() => {
                        setName("");
                        setAdding(true);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
                >
                    <Plus className="h-3.5 w-3.5" />
                </button>
                <button
                    type="button"
                    title="Renommer"
                    onClick={() => {
                        setName(column.name);
                        setRenaming(true);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
                >
                    <Pencil className="h-3 w-3" />
                </button>
                <button
                    type="button"
                    title="Supprimer"
                    onClick={handleDelete}
                    disabled={busy}
                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer disabled:opacity-50"
                >
                    <Trash2 className="h-3 w-3" />
                </button>
            </div>

            <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
                {column.cards.length === 0 && (
                    <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-border/70 py-6 text-[11px] text-muted-foreground">
                        {drag ? "Déposez ici" : "Aucune carte"}
                    </div>
                )}
                {column.cards.map((card) => (
                    <KanbanCardItem
                        key={card.id}
                        card={card}
                        column={column}
                        dragDisabled={!!drag}
                        isDragging={drag?.cardId === card.id}
                        isDragOver={dragOverCardId === card.id}
                        onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", String(card.id));
                            onDragStartCard(card.id, e);
                        }}
                        onDragEnd={onDragEnd}
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDragOverCard(card.id, e);
                        }}
                        onDrop={(e) => onDropOnCard(card.id, e)}
                        onChanged={onChanged}
                    />
                ))}
            </div>

            <Dialog open={adding} onOpenChange={setAdding}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Nouvelle carte</DialogTitle>
                        <DialogDescription>
                            Ajoutez une carte dans « {column.name} ».
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAdd} className="space-y-3">
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Titre de la carte"
                            autoFocus
                            required
                        />
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setAdding(false)}
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

            <Dialog open={renaming} onOpenChange={setRenaming}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Renommer la colonne</DialogTitle>
                        <DialogDescription>Modifiez le nom de la colonne.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleRename} className="space-y-3">
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
                                onClick={() => setRenaming(false)}
                            >
                                <X className="h-4 w-4" />
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
        </div>
    );
}
