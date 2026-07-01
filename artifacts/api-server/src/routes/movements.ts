import { Router } from "express";
import { db, movementsTable, usersTable } from "@workspace/db";
import { eq, gte, lte, and, ilike, or } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router = Router();
const movementTypes = [
  "achat",
  "vente",
  "entree_troc",
  "depense",
  "retrait_membre",
  "entree_caisse",
  "sortie_partenaire",
  "retour_partenaire",
  "modification_produit",
  "suppression_produit",
  "annulation",
] as const;

function isDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeTimeString(value: string): string | null {
  const trimmed = value.trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  return null;
}

router.get("/", requireAuth, async (req, res): Promise<void> => {
  const { type, status, dateFrom, dateTo, search } = req.query as Record<string, string>;
  const selectedType = status && status !== "tous" ? status : type;

  const rows = await db.select().from(movementsTable)
    .leftJoin(usersTable, eq(movementsTable.userId, usersTable.id))
    .orderBy(movementsTable.movementDate);

  const filtered = rows.filter(r => {
    const m = r.movements;
    if (selectedType && selectedType !== "tous" && m.movementType !== selectedType) return false;
    if (dateFrom && m.movementDate < dateFrom) return false;
    if (dateTo && m.movementDate > dateTo) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!m.description.toLowerCase().includes(q) &&
          !m.productRef?.toLowerCase().includes(q) &&
          !m.imei?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  res.json(filtered.map(r => ({
    ...r.movements,
    user: r.users ? { id: r.users.id, username: r.users.username, fullName: r.users.fullName, role: r.users.role, createdAt: r.users.createdAt } : null,
  })).sort((a, b) => b.movementDate.localeCompare(a.movementDate) || b.movementTime.localeCompare(a.movementTime)));
});

router.patch("/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id));
  const { movementType, movementDate, movementTime, description, productRef, imei } = req.body;
  const updates: Partial<typeof movementsTable.$inferInsert> = {};

  if (movementType !== undefined) {
    if (!movementTypes.includes(movementType)) {
      res.status(400).json({ error: "Type de mouvement invalide" });
      return;
    }
    updates.movementType = movementType;
  }
  if (movementDate !== undefined) {
    const value = String(movementDate).trim();
    if (!isDateString(value)) { res.status(400).json({ error: "Date invalide" }); return; }
    updates.movementDate = value;
  }
  if (movementTime !== undefined) {
    const value = normalizeTimeString(String(movementTime));
    if (!value) { res.status(400).json({ error: "Heure invalide" }); return; }
    updates.movementTime = value;
  }
  if (description !== undefined) {
    const value = String(description).trim();
    if (!value) { res.status(400).json({ error: "Description requise" }); return; }
    updates.description = value;
  }
  if (productRef !== undefined) updates.productRef = productRef ? String(productRef).trim() : null;
  if (imei !== undefined) updates.imei = imei ? String(imei).trim() : null;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Aucune modification fournie" });
    return;
  }

  const [row] = await db.update(movementsTable).set(updates).where(eq(movementsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Mouvement non trouve" }); return; }
  res.json(row);
});

router.delete("/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id));
  const [row] = await db.delete(movementsTable).where(eq(movementsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Mouvement non trouve" }); return; }
  res.status(204).send();
});

export default router;
