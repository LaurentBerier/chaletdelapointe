import { Router, type IRouter } from "express";
import { pool, type PoolClient } from "../../../../lib/db/src/index.js";
import { requireAccount } from "../middlewares/auth.js";
import {
  canManageDocuments,
  canReadDocuments,
  type CommunityDocument,
  type CommunitySection,
} from "../../../../lib/shared/community.js";

const router: IRouter = Router();
const uuid = (s: unknown): s is string =>
  typeof s === "string" && /^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(s);
const field = (s: unknown, max: number): s is string =>
  typeof s === "string" && !!s.trim() && s.trim().length <= max;
class Problem extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const fail = (status: number, message: string): never => {
  throw new Problem(status, message);
};
function docInput(input: any) {
  if (
    !field(input?.title, 180) ||
    typeof input?.introduction !== "string" ||
    input.introduction.length > 4000 ||
    !Array.isArray(input.sections) ||
    input.sections.length < 1 ||
    input.sections.length > 40 ||
    !["discussion", "adopted", "archived"].includes(input.status)
  )
    fail(400, "Vérifiez le titre et les sections du document.");
  const seen = new Set();
  const sections = input.sections.map((s: any) => {
    if (
      !field(s.id, 80) ||
      !/^[a-z0-9-]+$/.test(s.id) ||
      seen.has(s.id) ||
      !field(s.title, 180) ||
      !field(s.body, 12000)
    )
      fail(400, "Chaque section doit avoir un titre et un texte distincts.");
    seen.add(s.id);
    return { id: s.id, title: s.title.trim(), body: s.body.trim() };
  });
  return {
    title: input.title.trim(),
    introduction: input.introduction.trim(),
    sections,
    status: input.status,
  };
}
async function version(db: PoolClient, d: any, author: string | null) {
  await db.query(
    `insert into community_versions(document_id,version,title,introduction,sections,status,edited_by)
    values($1,$2,$3,$4,$5,$6,$7)`,
    [
      d.id,
      d.version,
      d.title,
      d.introduction,
      JSON.stringify(d.sections),
      d.status,
      author,
    ],
  );
}
async function saveDocument(
  db: PoolClient,
  d: any,
  input: any,
  author: string,
) {
  const {
    rows: [saved],
  } = await db.query(
    `update community_documents set title=$2,introduction=$3,sections=$4,status=$5,version=version+1,updated_by=$6,updated_at=now() where id=$1 returning *`,
    [
      d.id,
      input.title,
      input.introduction,
      JSON.stringify(input.sections),
      input.status,
      author,
    ],
  );
  await version(db, saved, author);
  return saved;
}
const textFields = `m.id,m.document_id,m.parent_id,m.author_id,u.name as author,m.topic_title,m.section_key,m.section_snapshot,m.document_version,m.kind,
  case when m.deleted_at is null then m.body else '' end as body,
  case when m.deleted_at is null then m.proposed_text else null end as proposed_text,
  m.status,m.applied_version,m.created_at,m.updated_at,m.deleted_at`;
router.use("/community", requireAccount);
// All operations use one transaction; document edits and suggestion applications
// lock the document and compare versions before producing an immutable snapshot.
router.use("/community", async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const actor = req.user!;
    const privateAccess = !!canReadDocuments(actor),
      manager = canManageDocuments(actor);
    const path = req.path.split("/").filter(Boolean);
    const method = req.method;
    const privateOnly = () => {
      if (!privateAccess)
        fail(
          403,
          "Cet espace est réservé aux copropriétaires et aux administrateurs.",
        );
    };
    const adminOnly = () => {
      if (!manager)
        fail(403, "Seuls les administrateurs peuvent modifier les règlements.");
    };
    let result: unknown;
    if (path[0] === "documents" && path.length === 1 && method === "GET") {
      privateOnly();
      result = (
        await client.query(
          `select d.*,u.name as editor,(select count(*)::int from community_messages m where m.document_id=d.id and m.deleted_at is null) as comment_count from community_documents d left join users u on u.id=d.updated_by order by d.updated_at desc`,
        )
      ).rows;
    } else if (
      path[0] === "documents" &&
      path.length === 1 &&
      method === "POST"
    ) {
      adminOnly();
      const input = docInput(req.body);
      const slug =
        input.title
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 65) +
        "-" +
        crypto.randomUUID().slice(0, 8);
      const {
        rows: [d],
      } = await client.query(
        `insert into community_documents(slug,title,introduction,sections,status,updated_by) values($1,$2,$3,$4,$5,$6) returning *`,
        [
          slug,
          input.title,
          input.introduction,
          JSON.stringify(input.sections),
          input.status,
          actor.id,
        ],
      );
      await version(client, d, actor.id);
      result = d;
    } else if (path[0] === "documents" && path[1]) {
      privateOnly();
      const {
        rows: [d],
      } = await client.query(
        `select * from community_documents where slug=$1 ${method === "PATCH" ? "for update" : ""}`,
        [path[1]],
      );
      if (!d) fail(404, "Document introuvable.");
      if (method === "GET" && path.length === 2) {
        const versions = (
          await client.query(
            `select v.version,v.created_at,u.name as editor from community_versions v left join users u on u.id=v.edited_by where document_id=$1 order by version desc`,
            [d.id],
          )
        ).rows;
        result = { ...d, versions };
      } else if (
        method === "GET" &&
        path[2] === "versions" &&
        /^\d+$/.test(path[3] || "")
      ) {
        result = (
          await client.query(
            `select v.*,u.name as editor from community_versions v left join users u on u.id=v.edited_by where document_id=$1 and version=$2`,
            [d.id, Number(path[3])],
          )
        ).rows[0];
        if (!result) fail(404, "Version introuvable.");
      } else if (method === "PATCH" && path.length === 2) {
        adminOnly();
        if (req.body.version !== d.version)
          fail(
            409,
            "Ce document a changé. Rechargez sa dernière version avant de l’enregistrer.",
          );
        result = await saveDocument(client, d, docInput(req.body), actor.id);
      } else fail(404, "Action introuvable.");
    } else if (path[0] === "threads" && method === "GET") {
      const documentId = req.query.document;
      if (documentId !== undefined) {
        privateOnly();
        if (!uuid(documentId)) fail(400, "Document invalide.");
      }
      const offset = Number(req.query.offset || 0);
      const threadId = req.query.thread;
      if (threadId !== undefined && !uuid(threadId))
        fail(400, "Discussion invalide.");
      if (!Number.isInteger(offset) || offset < 0) fail(400, "Page invalide.");
      const { rows } = await client.query(
        `select ${textFields},exists(select from community_follows f where f.thread_id=m.id and f.user_id=$2) as following
        from community_messages m join users u on u.id=m.author_id where m.parent_id is null and m.document_id is not distinct from $1::uuid
        and (m.document_id is not null or m.deleted_at is null)
        and ($4::uuid is null or m.id=$4) order by greatest(m.created_at,coalesce((select max(r.created_at) from community_messages r where r.parent_id=m.id),m.created_at)) desc,m.id limit 31 offset $3`,
        [documentId || null, actor.id, offset, threadId || null],
      );
      const roots = rows.slice(0, 30);
      const replies = roots.length
        ? (
            await client.query(
              `select ${textFields} from community_messages m join users u on u.id=m.author_id where m.parent_id=any($1::uuid[]) order by m.created_at,m.id`,
              [roots.map((r) => r.id)],
            )
          ).rows
        : [];
      result = {
        threads: roots.map((r) => ({
          ...r,
          replies: replies.filter((c) => c.parent_id === r.id),
        })),
        hasMore: rows.length > 30,
      };
    } else if (
      path[0] === "messages" &&
      method === "POST" &&
      path.length === 1
    ) {
      const b = req.body ?? {};
      if (!field(b.body, 6000))
        fail(400, "Écrivez un message de 1 à 6 000 caractères.");
      let docId: string | null = null,
        parent: any = null,
        section: CommunitySection | undefined,
        d: CommunityDocument | undefined;
      if (b.parentId) {
        if (!uuid(b.parentId)) fail(400, "Discussion invalide.");
        parent = (
          await client.query(
            "select * from community_messages where id=$1 and parent_id is null",
            [b.parentId],
          )
        ).rows[0];
        if (!parent) fail(404, "Discussion introuvable.");
        if (!parent.document_id && parent.deleted_at)
          fail(409, "Cette discussion a été retirée.");
        docId = parent.document_id;
      } else if (b.documentId) {
        if (!uuid(b.documentId)) fail(400, "Document invalide.");
        docId = b.documentId;
      }
      if (docId) {
        privateOnly();
        d = (
          await client.query(
            "select * from community_documents where id=$1 for share",
            [docId],
          )
        ).rows[0];
        if (!d) throw new Problem(404, "Document introuvable.");
        if (d.status === "archived") fail(409, "Ce document est archivé.");
        if (!parent && b.version !== d.version)
          fail(409, "Le document a changé. Rechargez-le avant de commenter.");
        if (!parent && b.sectionKey) {
          section = d.sections.find((s) => s.id === b.sectionKey);
          if (!section) fail(400, "Section introuvable.");
        }
      }
      const kind = b.kind || "comment";
      if (
        !["comment", "suggestion"].includes(kind) ||
        (kind === "suggestion" &&
          (parent || !section || !field(b.proposedText, 12000)))
      )
        fail(
          400,
          "Choisissez une section et indiquez le texte de remplacement proposé.",
        );
      if (!docId && !parent && !field(b.title, 180))
        fail(400, "Ajoutez un titre au sujet.");
      const {
        rows: [m],
      } = await client.query(
        `insert into community_messages(document_id,parent_id,author_id,topic_title,section_key,section_snapshot,document_version,kind,body,proposed_text)
        values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning *`,
        [
          docId,
          parent?.id || null,
          actor.id,
          !docId && !parent ? b.title.trim() : null,
          section?.id || null,
          section ? JSON.stringify(section) : null,
          d?.version || null,
          kind,
          b.body.trim(),
          kind === "suggestion" ? b.proposedText.trim() : null,
        ],
      );
      const root = parent?.id || m.id;
      await client.query(
        "insert into community_follows(thread_id,user_id) values($1,$2) on conflict do nothing",
        [root, actor.id],
      );
      if (parent)
        await client.query(
          `insert into community_notifications(user_id,thread_id,message_id)
        select f.user_id,$1,$2 from community_follows f join users u on u.id=f.user_id where f.thread_id=$1 and f.user_id<>$3 and u.account_status='approved' and not u.is_disabled
        and ($4::uuid is null or u."group"='proprietaire' or u.is_admin or u.is_reservation_admin) on conflict do nothing`,
          [root, m.id, actor.id, docId],
        );
      result = m;
    } else if (path[0] === "messages" && uuid(path[1])) {
      const {
        rows: [m],
      } = await client.query(
        "select * from community_messages where id=$1 for update",
        [path[1]],
      );
      if (!m) fail(404, "Message introuvable.");
      if (m.document_id) privateOnly();
      if (path[2] === "follow" && method === "POST" && !m.parent_id) {
        if (typeof req.body.following !== "boolean")
          fail(400, "Choix invalide.");
        if (req.body.following)
          await client.query(
            "insert into community_follows(thread_id,user_id) values($1,$2) on conflict do nothing",
            [m.id, actor.id],
          );
        else
          await client.query(
            "delete from community_follows where thread_id=$1 and user_id=$2",
            [m.id, actor.id],
          );
        result = { ok: true };
      } else if (path[2] === "apply" && method === "POST") {
        adminOnly();
        if (m.kind !== "suggestion" || m.deleted_at || m.status !== "open")
          fail(409, "Cette suggestion ne peut plus être intégrée.");
        const {
          rows: [d],
        } = await client.query(
          "select * from community_documents where id=$1 for update",
          [m.document_id],
        );
        if (d.status === "archived" || d.version !== req.body.version)
          fail(409, "Le document a changé. Rechargez-le avant de continuer.");
        const section = d.sections.find(
          (s: CommunitySection) => s.id === m.section_key,
        );
        if (!section || section.body !== m.section_snapshot?.body)
          fail(
            409,
            "Cette section a changé depuis la suggestion. Comparez les textes et utilisez l’éditeur pour l’intégrer.",
          );
        const saved = await saveDocument(
          client,
          d,
          {
            ...d,
            sections: d.sections.map((s: CommunitySection) =>
              s.id === m.section_key ? { ...s, body: m.proposed_text } : s,
            ),
          },
          actor.id,
        );
        await client.query(
          "update community_messages set status='applied',applied_version=$2 where id=$1",
          [m.id, saved.version],
        );
        result = saved;
      } else if (path[2] === "status" && method === "POST") {
        adminOnly();
        if (
          m.parent_id ||
          m.status === "applied" ||
          !["open", "resolved", "declined"].includes(req.body.status)
        )
          fail(400, "Statut invalide.");
        result = (
          await client.query(
            "update community_messages set status=$2 where id=$1 returning id,status",
            [m.id, req.body.status],
          )
        ).rows[0];
      } else if (path.length === 2 && method === "PATCH") {
        if (m.author_id !== actor.id)
          fail(403, "Vous pouvez modifier uniquement vos propres messages.");
        if (m.deleted_at || m.status === "applied")
          fail(409, "Ce message ne peut plus être modifié.");
        if (
          !field(req.body.body, 6000) ||
          (m.kind === "suggestion" && !field(req.body.proposedText, 12000))
        )
          fail(400, "Vérifiez votre message.");
        if (
          req.body.updatedAt !== m.updated_at?.toISOString() &&
          !(req.body.updatedAt === null && m.updated_at === null)
        )
          fail(409, "Ce message a changé. Rechargez la discussion.");
        result = (
          await client.query(
            "update community_messages set body=$2,proposed_text=$3,updated_at=now() where id=$1 returning id",
            [
              m.id,
              req.body.body.trim(),
              m.kind === "suggestion" ? req.body.proposedText.trim() : null,
            ],
          )
        ).rows[0];
      } else if (path.length === 2 && method === "DELETE") {
        if (m.author_id !== actor.id && !manager)
          fail(403, "Vous pouvez supprimer uniquement vos propres messages.");
        if (m.status === "applied")
          fail(409, "Une suggestion intégrée est conservée dans l’historique.");
        await client.query(
          "update community_messages set deleted_at=coalesce(deleted_at,now()),body='',proposed_text=case when kind='suggestion' then '' else null end where id=$1",
          [m.id],
        );
        result = { ok: true };
      } else fail(404, "Action introuvable.");
    } else if (path[0] === "notifications" && method === "GET") {
      result = (
        await client.query(
          `select n.id,n.read_at,n.created_at,n.thread_id,m.document_id,d.slug as document_slug,
        coalesce(t.topic_title,t.section_snapshot->>'title','Discussion du règlement') as title,u.name as author
        from community_notifications n join community_messages m on m.id=n.message_id join community_messages t on t.id=n.thread_id
        join users u on u.id=m.author_id left join community_documents d on d.id=m.document_id
        where n.user_id=$1 and m.deleted_at is null and (t.document_id is not null or t.deleted_at is null) and (m.document_id is null or $2) order by n.created_at desc limit 100`,
          [actor.id, privateAccess],
        )
      ).rows;
    } else if (path[0] === "notifications" && method === "POST") {
      if (req.body.id && !uuid(req.body.id))
        fail(400, "Notification invalide.");
      await client.query(
        "update community_notifications set read_at=now() where user_id=$1 and ($2::uuid is null or id=$2)",
        [actor.id, req.body.id || null],
      );
      result = { ok: true };
    } else fail(404, "Action introuvable.");
    await client.query("commit");
    res.json(result);
  } catch (e) {
    await client.query("rollback");
    if (e instanceof Problem) res.status(e.status).json({ error: e.message });
    else next(e);
  } finally {
    client.release();
  }
});
export default router;
