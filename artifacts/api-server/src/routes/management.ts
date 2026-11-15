import { Router, type IRouter } from "express";
import { and, asc, desc, eq, ne, count, getTableColumns } from "drizzle-orm";
import {
  db,
  usersTable as users,
  posts,
  propertiesTable as properties,
} from "../../../../lib/db/src/index.js";
import { requireAccount, requireAdmin } from "../middlewares/auth.js";
import { randomUUID } from "node:crypto";

const router: IRouter = Router();
const field = (v: unknown, max: number) =>
  typeof v === "string" && v.trim().length > 0 && v.trim().length <= max;
const uuid = (v: unknown): v is string =>
  typeof v === "string" && /^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(v);
const account = {
  id: users.id,
  name: users.name,
  email: users.email,
  group: users.group,
  canApprove: users.canApprove,
  isDisabled: users.isDisabled,
  isAdmin: users.isAdmin,
  bookingAccess: users.bookingAccess,
  bookingAccessRequestedAt: users.bookingAccessRequestedAt,
};
router.patch("/me", requireAccount, async (req, res) => {
  const name = req.body?.name;
  if (!field(name, 80)) {
    res.status(400).json({ error: "Indiquez un nom de 1 à 80 caractères." });
    return;
  }
  const [row] = await db
    .update(users)
    .set({ name: name.trim() })
    .where(eq(users.id, req.user!.id))
    .returning({ name: users.name });
  res.json(row);
});
router.get("/admin/accounts", requireAdmin, async (_req, res) => {
  res.json(await db.select(account).from(users).orderBy(asc(users.name)));
});
router.patch("/admin/accounts/:id", requireAdmin, async (req, res) => {
  const { name, group, canApprove, isDisabled } = req.body ?? {};
  if (
    !uuid(req.params.id) ||
    (name !== undefined && !field(name, 80)) ||
    ![
      "public",
      "proprietaire",
      "ancien_proprietaire",
      "famille",
      "ami",
    ].includes(group) ||
    typeof canApprove !== "boolean" ||
    typeof isDisabled !== "boolean"
  ) {
    res.status(400).json({ error: "Paramètres du compte invalides." });
    return;
  }
  const [row] = await db
    .update(users)
    .set({
      ...(name === undefined ? {} : { name: name.trim() }),
      group,
      ...(group === "proprietaire"
        ? { bookingAccess: "none" as const, bookingAccessRequestedAt: null }
        : {}),
      canApprove: group === "proprietaire" && canApprove,
      isDisabled,
    })
    .where(and(eq(users.id, req.params.id), eq(users.isAdmin, false)))
    .returning(account);
  if (!row) {
    res.status(409).json({ error: "Compte introuvable ou protégé." });
    return;
  }
  res.json(row);
});
// A member can request only for their own identity. A separate administrator
// decision grants booking rights without changing ownership or calendar privacy.
router.post("/me/booking-access", requireAccount, async (req, res) => {
  const [row] = await db
    .update(users)
    .set({ bookingAccess: "pending", bookingAccessRequestedAt: new Date() })
    .where(
      and(
        eq(users.id, req.user!.id),
        eq(users.isDisabled, false),
        ne(users.group, "proprietaire"),
        eq(users.bookingAccess, "none"),
      ),
    )
    .returning({ bookingAccess: users.bookingAccess });
  if (row) {
    res.status(201).json(row);
    return;
  }
  const [current] = await db
    .select({
      bookingAccess: users.bookingAccess,
      group: users.group,
      isDisabled: users.isDisabled,
    })
    .from(users)
    .where(eq(users.id, req.user!.id));
  if (
    current &&
    !current.isDisabled &&
    current.group !== "proprietaire" &&
    current.bookingAccess === "pending"
  ) {
    res.json({ bookingAccess: "pending" });
    return;
  }
  res
    .status(409)
    .json({ error: "Votre accès a changé. Actualisez votre profil." });
});
router.get("/admin/booking-access/count", requireAdmin, async (_req, res) => {
  const [row] = await db
    .select({ pending: count() })
    .from(users)
    .where(
      and(
        eq(users.bookingAccess, "pending"),
        eq(users.isDisabled, false),
        ne(users.group, "proprietaire"),
      ),
    );
  res.json(row);
});
router.post(
  "/admin/accounts/:id/booking-access",
  requireAdmin,
  async (req, res) => {
    const decision = req.body?.decision;
    if (
      !uuid(req.params.id) ||
      !["approve", "deny", "revoke", "reopen"].includes(decision)
    ) {
      res.status(400).json({ error: "Décision invalide." });
      return;
    }
    const before =
      decision === "revoke"
        ? "granted"
        : decision === "reopen"
          ? "denied"
          : "pending";
    const after =
      decision === "approve"
        ? "granted"
        : decision === "deny"
          ? "denied"
          : "none";
    const [row] = await db
      .update(users)
      .set({
        bookingAccess: after,
        ...(after === "none" ? { bookingAccessRequestedAt: null } : {}),
      })
      .where(
        and(
          eq(users.id, req.params.id),
          eq(users.isAdmin, false),
          eq(users.isDisabled, false),
          ne(users.group, "proprietaire"),
          eq(users.bookingAccess, before),
        ),
      )
      .returning(account);
    if (!row) {
      res
        .status(409)
        .json({ error: "Ce compte ou cette demande a déjà changé." });
      return;
    }
    res.json(row);
  },
);
router.patch("/admin/properties/:id", requireAdmin, async (req, res) => {
  const { name, description, maxGuests } = req.body ?? {};
  if (
    !uuid(req.params.id) ||
    !field(name, 100) ||
    typeof description !== "string" ||
    description.length > 2000 ||
    !Number.isInteger(maxGuests) ||
    maxGuests < 1 ||
    maxGuests > 100
  ) {
    res
      .status(400)
      .json({ error: "Vérifiez le nom et la capacité (1 à 100)." });
    return;
  }
  const [row] = await db
    .update(properties)
    .set({ name: name.trim(), description: description.trim(), maxGuests })
    .where(eq(properties.id, req.params.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Chalet introuvable." });
    return;
  }
  res.json(row);
});
const projection = { ...getTableColumns(posts), author: users.name };
router.get("/journal", async (_req, res) => {
  const { authorId: _authorId, ...visible } = projection;
  res.json(
    await db
      .select(visible)
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .where(eq(posts.published, true))
      .orderBy(desc(posts.createdAt)),
  );
});
router.get("/account/articles", requireAccount, async (req, res) => {
  res.json(
    await db
      .select(projection)
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .where(req.user!.isAdmin ? undefined : eq(posts.authorId, req.user!.id))
      .orderBy(desc(posts.createdAt)),
  );
});
router.post("/account/articles", requireAccount, async (req, res) => {
  const { title, excerpt, content, published = false } = req.body ?? {};
  if (
    !field(title, 160) ||
    !field(excerpt, 500) ||
    !field(content, 30000) ||
    typeof published !== "boolean"
  ) {
    res.status(400).json({ error: "Vérifiez les trois champs de l’article." });
    return;
  }
  if (published && !req.user!.isAdmin) {
    res.status(403).json({ error: "Publication réservée à l’administration." });
    return;
  }
  const prefix =
    title
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 65) || "article";
  const [row] = await db
    .insert(posts)
    .values({
      slug: prefix + "-" + randomUUID().slice(0, 8),
      title: title.trim(),
      excerpt: excerpt.trim(),
      content: content.trim(),
      published,
      authorId: req.user!.id,
    })
    .returning();
  res.status(201).json(row);
});
router.patch("/account/articles/:id", requireAccount, async (req, res) => {
  const { title, excerpt, content, published = false } = req.body ?? {};
  if (
    !uuid(req.params.id) ||
    !field(title, 160) ||
    !field(excerpt, 500) ||
    !field(content, 30000) ||
    typeof published !== "boolean"
  ) {
    res.status(400).json({ error: "Article invalide." });
    return;
  }
  if (published && !req.user!.isAdmin) {
    res.status(403).json({ error: "Publication réservée à l’administration." });
    return;
  }
  const [row] = await db
    .update(posts)
    .set({
      title: title.trim(),
      excerpt: excerpt.trim(),
      content: content.trim(),
      published,
    })
    .where(
      and(
        eq(posts.id, req.params.id),
        req.user!.isAdmin
          ? undefined
          : and(eq(posts.authorId, req.user!.id), eq(posts.published, false)),
      ),
    )
    .returning();
  if (!row) {
    res.status(404).json({ error: "Article introuvable ou déjà publié." });
    return;
  }
  res.json(row);
});
router.delete("/admin/articles/:id", requireAdmin, async (req, res) => {
  if (!uuid(req.params.id)) {
    res.status(400).json({ error: "Article invalide." });
    return;
  }
  const [row] = await db
    .delete(posts)
    .where(eq(posts.id, req.params.id))
    .returning({ id: posts.id });
  if (!row) {
    res.status(404).json({ error: "Article introuvable." });
    return;
  }
  res.json(row);
});
export default router;
