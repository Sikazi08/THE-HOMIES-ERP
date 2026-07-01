import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useListMovements, getListMovementsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDateFr } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Download, Search, ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";

const MOVEMENT_TYPES = [
  { value: "achat", label: "Achat stock" },
  { value: "vente", label: "Vente" },
  { value: "entree_troc", label: "Entree troc" },
  { value: "depense", label: "Depense" },
  { value: "retrait_membre", label: "Retrait membre" },
  { value: "entree_caisse", label: "Entree caisse" },
  { value: "sortie_partenaire", label: "Sortie partenaire" },
  { value: "retour_partenaire", label: "Retour partenaire" },
  { value: "modification_produit", label: "Modification" },
  { value: "suppression_produit", label: "Suppression" },
  { value: "annulation", label: "Annulation" },
];

export default function Mouvements() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("tous");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [editingMovement, setEditingMovement] = useState<any | null>(null);
  const [editMovementType, setEditMovementType] = useState("achat");
  const [editMovementDate, setEditMovementDate] = useState("");
  const [editMovementTime, setEditMovementTime] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editProductRef, setEditProductRef] = useState("");
  const [editImei, setEditImei] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const movementsQueryParams = {
    search: search || undefined,
    type: statusFilter !== "tous" ? statusFilter : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };
  const { data: allMovements = [], isLoading } = useListMovements(movementsQueryParams, { query: { queryKey: getListMovementsQueryKey(movementsQueryParams) } });
  const total = allMovements.length;
  const totalPages = Math.ceil(total / pageSize);
  const movements = allMovements.slice((page - 1) * pageSize, page * pageSize);

  const getMovementTypeBadge = (type: string) => {
    switch (type) {
      case 'achat': return <Badge className="bg-blue-500/20 text-blue-500">Achat Stock</Badge>;
      case 'vente': return <Badge className="bg-green-500/20 text-green-500">Vente</Badge>;
      case 'entree_troc': return <Badge className="bg-purple-500/20 text-purple-500">Entrée Troc</Badge>;
      case 'depense': return <Badge className="bg-destructive/20 text-destructive">Dépense</Badge>;
      case 'retrait_membre': return <Badge className="bg-destructive/20 text-destructive">Retrait Membre</Badge>;
      case 'entree_caisse': return <Badge className="bg-green-500/20 text-green-500">Entrée Caisse</Badge>;
      case 'sortie_partenaire': return <Badge className="bg-orange-500/20 text-orange-500">Sortie Partenaire</Badge>;
      case 'retour_partenaire': return <Badge className="bg-teal-500/20 text-teal-500">Retour Partenaire</Badge>;
      case 'modification_produit': return <Badge className="bg-yellow-500/20 text-yellow-500">Modification</Badge>;
      case 'suppression_produit': return <Badge variant="outline">Suppression</Badge>;
      case 'annulation': return <Badge variant="destructive">Annulation</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  const refreshMovements = () => {
    queryClient.invalidateQueries({ queryKey: getListMovementsQueryKey(movementsQueryParams) });
  };

  const openEditMovement = (movement: any) => {
    setEditingMovement(movement);
    setEditMovementType(movement.movementType || "achat");
    setEditMovementDate(movement.movementDate || "");
    setEditMovementTime((movement.movementTime || "").substring(0, 5));
    setEditDescription(movement.description || "");
    setEditProductRef(movement.productRef || "");
    setEditImei(movement.imei || "");
  };

  const handleSaveMovement = async () => {
    if (!editingMovement) return;
    if (!editDescription.trim()) {
      toast.error("La description est obligatoire");
      return;
    }
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/movements/${editingMovement.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movementType: editMovementType,
          movementDate: editMovementDate,
          movementTime: editMovementTime,
          description: editDescription.trim(),
          productRef: editProductRef.trim() || null,
          imei: editImei.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erreur lors de la modification");
      }
      toast.success("Mouvement modifie");
      setEditingMovement(null);
      refreshMovements();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de la modification");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteMovement = async (movement: any) => {
    if (!confirm("Supprimer ce mouvement ?")) return;
    const res = await fetch(`/api/movements/${movement.id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Erreur lors de la suppression");
      return;
    }
    toast.success("Mouvement supprime");
    refreshMovements();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Journal des Mouvements</h1>
        {isAdmin && (
          <Button variant="outline" onClick={() => window.open('/api/exports/movements', '_blank')} className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            Exporter
          </Button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row flex-wrap gap-3 items-center bg-card p-4 rounded-lg border border-border">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher..." 
            className="pl-9 bg-background border-border"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-52 bg-background border-border">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous statuts</SelectItem>
            <SelectItem value="achat">Achat stock</SelectItem>
            <SelectItem value="vente">Vente</SelectItem>
            <SelectItem value="entree_troc">Entrée troc</SelectItem>
            <SelectItem value="depense">Dépense</SelectItem>
            <SelectItem value="retrait_membre">Retrait membre</SelectItem>
            <SelectItem value="entree_caisse">Entrée caisse</SelectItem>
            <SelectItem value="sortie_partenaire">Sortie partenaire</SelectItem>
            <SelectItem value="retour_partenaire">Retour partenaire</SelectItem>
            <SelectItem value="modification_produit">Modification</SelectItem>
            <SelectItem value="suppression_produit">Suppression</SelectItem>
            <SelectItem value="annulation">Annulation</SelectItem>
          </SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
          <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="bg-background border-border w-full sm:w-36" />
          <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="bg-background border-border w-full sm:w-36" />
        </div>
        {(dateFrom || dateTo || statusFilter !== "tous") && (
          <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); setStatusFilter("tous"); setPage(1); }}>
            Effacer
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent bg-muted/50">
              <TableHead>Date & Heure</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Utilisateur</TableHead>
              {isAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={isAdmin ? 5 : 4} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></TableCell></TableRow>
            ) : movements.length === 0 ? (
              <TableRow><TableCell colSpan={isAdmin ? 5 : 4} className="h-24 text-center text-muted-foreground">Aucun mouvement trouvé.</TableCell></TableRow>
            ) : (
              movements.map((m) => (
                <TableRow key={m.id} className="border-border">
                  <TableCell className="text-sm">
                    {formatDateFr(m.movementDate)} <br/><span className="text-muted-foreground text-xs">{m.movementTime.substring(0,5)}</span>
                  </TableCell>
                  <TableCell>{getMovementTypeBadge(m.movementType)}</TableCell>
                  <TableCell>
                    <span className="font-medium">{m.description}</span>
                    {(m.productRef || m.imei) && (
                      <div className="text-xs text-muted-foreground mt-1">Ref: {m.productRef} | IMEI: {m.imei}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{m.user?.fullName || "Système"}</TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditMovement(m)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => void handleDeleteMovement(m)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">{total} mouvement{total !== 1 ? "s" : ""} · page {page}/{totalPages}</p>
            <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-24 h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      <Dialog open={!!editingMovement} onOpenChange={(open) => !open && setEditingMovement(null)}>
        <DialogContent className="sm:max-w-[560px] bg-card border-border text-foreground">
          <DialogHeader><DialogTitle>Modifier le mouvement</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={editMovementType} onValueChange={setEditMovementType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MOVEMENT_TYPES.map(type => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="movement-date">Date</Label>
                  <Input id="movement-date" type="date" value={editMovementDate} onChange={e => setEditMovementDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="movement-time">Heure</Label>
                  <Input id="movement-time" type="time" value={editMovementTime} onChange={e => setEditMovementTime(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="movement-description">Description</Label>
              <Input id="movement-description" value={editDescription} onChange={e => setEditDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="movement-ref">Reference produit</Label>
                <Input id="movement-ref" value={editProductRef} onChange={e => setEditProductRef(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="movement-imei">IMEI</Label>
                <Input id="movement-imei" value={editImei} onChange={e => setEditImei(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingMovement(null)}>Annuler</Button>
              <Button onClick={() => void handleSaveMovement()} disabled={savingEdit}>
                {savingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
