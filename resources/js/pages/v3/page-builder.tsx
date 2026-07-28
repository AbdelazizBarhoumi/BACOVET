import { Head, Link, router } from "@inertiajs/react";
import { Plus, Copy, Trash2, Pencil, ExternalLink, Link as LinkIcon, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSidebarStructure } from "@/lib/groups-registry";
import { usePagesRegistry } from "@/lib/pages-registry";

export default function V3PageBuilder() {
  const { pages, loading, createPage, renamePage, changeSlug, duplicatePage, deletePage, updatePage } = usePagesRegistry();
  const { groups } = useSidebarStructure();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGroupId, setNewGroupId] = useState<string>("");
  const [editing, setEditing] = useState<{ id: number; name: string; slug: string; group_id: number | null } | null>(null);
  const [busy, setBusy] = useState(false);

  const doCreate = async () => {
    setBusy(true);
    const p = await createPage(newName || "Nouvelle page", newGroupId ? parseInt(newGroupId) : null);
    setBusy(false);
    setNewName("");
    setNewGroupId("");
    setCreating(false);
    if (p) {
      toast.success(`Page « ${p.name} » créée`);
      router.visit(`/p/${p.slug}`);
    } else {
      toast.error("Erreur lors de la création");
    }
  };

  const copyUrl = (slug: string) => {
    const url = `${window.location.origin}/p/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("URL copiée");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Head title="Pages Builder — BACOVET" />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Pages Builder</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Constructeur unifié — créez autant de tableaux de bord que nécessaire, chacun avec sa propre URL.
            </p>
          </div>
          <Button onClick={() => setCreating(true)} className="uppercase tracking-wider text-xs" disabled={busy}>
            <Plus className="h-4 w-4 mr-1.5" /> Nouvelle page
          </Button>
        </div>
        {pages.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-12 text-center">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <div className="text-sm text-muted-foreground mb-4">Aucune page. Créez votre premier tableau de bord.</div>
            <Button onClick={() => setCreating(true)} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1.5" /> Créer une page
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pages.map((p) => (
              <div key={p.id} className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-bold truncate">{p.name}</div>
                    <div className="text-[11px] font-mono text-muted-foreground truncate flex items-center gap-1">
                      <LinkIcon className="h-3 w-3" /> /p/{p.slug}
                    </div>
                  </div>
                </div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Créée le {new Date(p.created_at).toLocaleDateString("fr-FR")}
                </div>
                {p.group_id && (
                  <div className="text-[10px] font-mono text-muted-foreground">
                    Groupe: {groups.find((g) => g.id === p.group_id)?.name ?? p.group_id}
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  <Link href={`/p/${p.slug}`}>
                    <Button size="sm" className="h-7 text-[11px] uppercase tracking-wider">
                      <ExternalLink className="h-3 w-3 mr-1" /> Ouvrir
                    </Button>
                  </Link>
                  <Button size="sm" variant="outline" className="h-7 text-[11px]"
                    onClick={() => setEditing({ id: p.id, name: p.name, slug: p.slug, group_id: p.group_id })}>
                    <Pencil className="h-3 w-3 mr-1" /> Éditer
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => copyUrl(p.slug)}>
                    <LinkIcon className="h-3 w-3 mr-1" /> URL
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[11px]"
                    onClick={async () => {
                      setBusy(true);
                      const c = await duplicatePage(p.id);
                      setBusy(false);
                      if (c) toast.success(`Dupliqué : ${c.name}`);
                    }}>
                    <Copy className="h-3 w-3 mr-1" /> Dupliquer
                  </Button>
                  <Button size="sm" variant="destructive" className="h-7 text-[11px] ml-auto"
                    disabled={busy}
                    onClick={async () => {
                      if (confirm(`Supprimer « ${p.name} » ? Cette action est irréversible.`)) {
                        setBusy(true);
                        const ok = await deletePage(p.id);
                        setBusy(false);
                        if (ok) toast.success("Page supprimée");
                      }
                    }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle page</DialogTitle>
            <DialogDescription>Nommez votre tableau de bord. Une URL directe sera générée.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="ex. Production Chaîne 12"
              onKeyDown={(e) => e.key === "Enter" && doCreate()}
            />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Groupe</div>
              <Select value={newGroupId} onValueChange={setNewGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="Aucun groupe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucun groupe</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)} disabled={busy}>Annuler</Button>
            <Button onClick={doCreate} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Éditer la page</DialogTitle>
            <DialogDescription>Modifier le nom, l'URL (slug) ou le groupe. Les widgets sont conservés.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Nom</div>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Slug (URL)</div>
                <Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
                <div className="text-[10px] text-muted-foreground mt-1 font-mono">/p/{editing.slug}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Groupe</div>
                <Select
                  value={String(editing.group_id ?? "")}
                  onValueChange={(v) => setEditing({ ...editing, group_id: v ? parseInt(v) : null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Aucun groupe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Aucun groupe</SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={busy}>Annuler</Button>
            <Button
              disabled={busy}
              onClick={async () => {
                if (!editing) return;
                setBusy(true);
                await updatePage(editing.id, {
                  name: editing.name,
                  slug: editing.slug,
                  group_id: editing.group_id,
                });
                setBusy(false);
                toast.success("Page mise à jour");
                setEditing(null);
              }}
            >
              {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
