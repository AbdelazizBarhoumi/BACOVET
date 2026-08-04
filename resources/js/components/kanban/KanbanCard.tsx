import { Loader2, Trash2, ImagePlus } from "lucide-react";
import { useRef, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
    deleteCard,
    type KanbanCard,
    type KanbanColumn,
    updateCard,
    uploadCardImage,
} from "@/services/kanbanApi";

export type DragState = {
    cardId: number;
    fromColumnId: number;
};

export function KanbanCardItem({
    card,
    column,
    isDragging,
    isDragOver,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
    onChanged,
    dragDisabled,
}: {
    card: KanbanCard;
    column: KanbanColumn;
    isDragging: boolean;
    isDragOver: boolean;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: () => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onChanged: () => void;
    dragDisabled: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [viewingImage, setViewingImage] = useState(false);
    const [title, setTitle] = useState(card.title);
    const [description, setDescription] = useState(card.description ?? "");
    const [busy, setBusy] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            await updateCard(card.id, { title, description });
            toast.success("Carte mise à jour");
            setOpen(false);
            onChanged();
        } catch (err) {
            toast.error((err as Error).message || "Erreur de sauvegarde");
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        setBusy(true);
        try {
            await deleteCard(card.id);
            toast.success("Carte supprimée");
            setOpen(false);
            onChanged();
        } catch (err) {
            toast.error((err as Error).message || "Erreur de suppression");
        } finally {
            setBusy(false);
        }
    };

    const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        uploadCardImage(card.id, file)
            .then(() => {
                toast.success("Image téléversée");
                onChanged();
            })
            .catch((err) => toast.error((err as Error).message || "Échec du téléversement"))
            .finally(() => {
                setUploading(false);
                if (fileRef.current) fileRef.current.value = "";
            });
    };

    return (
        <>
            <div
                draggable={!dragDisabled}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragOver={onDragOver}
                onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDrop(e);
                }}
                onClick={() => setOpen(true)}
                className={`group cursor-pointer rounded-md border bg-card p-2.5 shadow-sm transition-colors select-none ${
                    isDragging ? "opacity-40 ring-2 ring-primary" : ""
                } ${isDragOver ? "ring-2 ring-primary" : ""}`}
            >
                {card.image_url && (
                    <div
                        className="mb-2 overflow-hidden rounded-md border border-border/60"
                        onClick={(e) => {
                            e.stopPropagation();
                            setViewingImage(true);
                        }}
                    >
                        <img
                            src={card.image_url}
                            alt={card.title}
                            className="h-24 w-full cursor-zoom-in object-cover transition-transform duration-200 hover:scale-105"
                        />
                    </div>
                )}
                <div className="text-sm font-medium leading-snug text-foreground">
                    {card.title}
                </div>
                {card.description && (
                    <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {card.description}
                    </div>
                )}
                <div className="mt-1.5 flex items-center gap-1">
                    <button
                        type="button"
                        title="Ajouter une image"
                        disabled={uploading}
                        onClick={(e) => {
                            e.stopPropagation();
                            fileRef.current?.click();
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100 disabled:opacity-50"
                    >
                        {uploading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <ImagePlus className="h-3.5 w-3.5" />
                        )}
                    </button>
                    <span className="text-[10px] text-muted-foreground/70">
                        {column.name}
                    </span>
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={onPickFile}
                    />
                </div>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Modifier la carte</DialogTitle>
                        <DialogDescription>
                            Mettez à jour le titre, la description ou supprimez la carte.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={save} className="space-y-3">
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Titre"
                            autoFocus
                            required
                        />
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Description (optionnelle)"
                            rows={4}
                        />
                        <DialogFooter className="gap-2 sm:justify-between">
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={remove}
                                disabled={busy}
                                className="gap-1.5"
                            >
                                <Trash2 className="h-4 w-4" />
                                Supprimer
                            </Button>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setOpen(false)}
                                >
                                    Annuler
                                </Button>
                                <Button type="submit" disabled={busy || !title.trim()}>
                                    {busy ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : null}
                                    Enregistrer
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={viewingImage} onOpenChange={setViewingImage}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{card.title}</DialogTitle>
                    </DialogHeader>
                    {card.image_url && (
                        <img
                            src={card.image_url}
                            alt={card.title}
                            className="max-h-[70vh] w-full rounded-md border border-border/60 object-contain"
                        />
                    )}
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setViewingImage(false)}
                        >
                            Fermer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
