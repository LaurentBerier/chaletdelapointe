import { Router, type IRouter } from "express";
import { pool } from "../../../../lib/db/src/index.js";
import { requireAccount } from "../middlewares/auth.js";
import { managesStays as isStaff } from "../../../../lib/shared/reservation-roles.js";
const router: IRouter = Router();
const uuid = (s: unknown): s is string =>
  typeof s === "string" && /^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(s);
router.use("/account/blog", requireAccount);
router.get("/account/blog/:slug/comments", async (req, res) => {
  const manager = isStaff(req.user);
  const {
    rows: [post],
  } = await pool.query(
    `select id,published,removed_at,author_id,comments_locked from blog_posts where slug=$1`,
    [req.params.slug],
  );
  if (
    !post ||
    (!(post.published && !post.removed_at) &&
      !manager &&
      post.author_id !== req.user!.id)
  ) {
    res.status(404).json({ error: "Article introuvable." });
    return;
  }
  const offset = Number(req.query.offset || 0);
  if (!Number.isInteger(offset) || offset < 0) {
    res.status(400).json({ error: "Page invalide." });
    return;
  }
  const fields = `c.id,c.parent_id,c.author_id,u.name as author,case when c.removed_at is null or $2 then c.body else '' end as body,c.created_at,c.updated_at,c.removed_at`;
  const { rows } = await pool.query(
    `select ${fields} from blog_comments c join users u on u.id=c.author_id where c.post_id=$1 and c.parent_id is null order by c.created_at desc,c.id limit 31 offset $3`,
    [post.id, manager, offset],
  );
  const roots = rows.slice(0, 30),
    replies = roots.length
      ? (
          await pool.query(
            `select ${fields} from blog_comments c join users u on u.id=c.author_id where c.parent_id=any($1::uuid[]) order by c.created_at`,
            [roots.map((r) => r.id), manager],
          )
        ).rows
      : [];
  res.json({
    locked: post.comments_locked || !post.published || !!post.removed_at,
    comments: roots.map((r) => ({
      ...r,
      replies: replies.filter((x) => x.parent_id === r.id),
    })),
    hasMore: rows.length > 30,
  });
});
router.post("/account/blog/:slug/comments", async (req, res) => {
  const body = req.body?.body,
    parent = req.body?.parentId;
  if (
    typeof body !== "string" ||
    !body.trim() ||
    body.trim().length > 6000 ||
    (parent && !uuid(parent))
  ) {
    res
      .status(400)
      .json({ error: "Écrivez un commentaire de 1 à 6 000 caractères." });
    return;
  }
  const client = await pool.connect();
  try {
    await client.query("begin");
    const {
      rows: [post],
    } = await client.query(
      `select id,published,removed_at,comments_locked from blog_posts where slug=$1 for share`,
      [req.params.slug],
    );
    if (!post || !post.published || post.removed_at) {
      await client.query("rollback");
      res.status(404).json({ error: "Article introuvable." });
      return;
    }
    if (post.comments_locked) {
      await client.query("rollback");
      res
        .status(409)
        .json({ error: "Les commentaires de cet article sont fermés." });
      return;
    }
    if (
      parent &&
      !(
        await client.query(
          "select id from blog_comments where id=$1 and post_id=$2 and parent_id is null",
          [parent, post.id],
        )
      ).rowCount
    ) {
      await client.query("rollback");
      res.status(400).json({ error: "Commentaire parent introuvable." });
      return;
    }
    const {
      rows: [c],
    } = await client.query(
      `insert into blog_comments(post_id,parent_id,author_id,body) values($1,$2,$3,$4) returning id`,
      [post.id, parent || null, req.user!.id, body.trim()],
    );
    await client.query("commit");
    res.status(201).json(c);
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
});
router.patch("/account/blog/comments/:id", async (req, res) => {
  if (!uuid(req.params.id)) {
    res.status(400).json({ error: "Commentaire invalide." });
    return;
  }
  const { body, action, updatedAt } = req.body || {},
    manager = isStaff(req.user);
  const client = await pool.connect();
  try {
    await client.query("begin");
    const {
      rows: [c],
    } = await client.query(
      `select c.*,p.published,p.removed_at as post_removed,p.comments_locked from blog_comments c join blog_posts p on p.id=c.post_id where c.id=$1 for update of c`,
      [req.params.id],
    );
    if (!c) {
      await client.query("rollback");
      res.status(404).json({ error: "Commentaire introuvable." });
      return;
    }
    if (
      (action === "restore" && !manager) ||
      (!manager && c.author_id !== req.user!.id) ||
      (action !== "remove" &&
        action !== "restore" &&
        c.author_id !== req.user!.id)
    ) {
      await client.query("rollback");
      res.status(403).json({
        error:
          "Vous pouvez modifier uniquement vos propres commentaires. La modération est réservée aux admins.",
      });
      return;
    }
    if (action === "remove" || action === "restore") {
      await client.query(
        `update blog_comments set removed_at=case when $2 then now() else null end,removed_by=case when $2 then $3::uuid else null end where id=$1`,
        [c.id, action === "remove", req.user!.id],
      );
    } else {
      if (c.removed_at || !c.published || c.post_removed || c.comments_locked) {
        await client.query("rollback");
        res.status(409).json({
          error: "Ce commentaire ne peut pas être modifié pour le moment.",
        });
        return;
      }
      if (
        typeof body !== "string" ||
        !body.trim() ||
        body.trim().length > 6000
      ) {
        await client.query("rollback");
        res.status(400).json({ error: "Commentaire invalide." });
        return;
      }
      if (updatedAt !== (c.updated_at?.toISOString() ?? null)) {
        await client.query("rollback");
        res
          .status(409)
          .json({ error: "Le commentaire a changé. Rechargez la page." });
        return;
      }
      await client.query(
        "update blog_comments set body=$2,updated_at=now() where id=$1",
        [c.id, body.trim()],
      );
    }
    await client.query("commit");
    res.json({ ok: true });
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
});
export default router;
