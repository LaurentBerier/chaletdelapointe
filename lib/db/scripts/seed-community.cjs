// Explicit, idempotent initial publication; never replaces an edited document.
const { Client } = require("pg");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const content = JSON.parse(
  readFileSync(
    resolve(__dirname, "../../../supabase/content/reservation-policy.json"),
    "utf8",
  ),
);
const db = new Client({
  connectionString: process.env.DATABASE_URL,
  ...(process.env.DATABASE_CA_CERT
    ? { ssl: { ca: process.env.DATABASE_CA_CERT, rejectUnauthorized: true } }
    : {}),
});
(async () => {
  await db.connect();
  try {
    await db.query("begin");
    const {
      rows: [d],
    } = await db.query(
      `insert into community_documents(slug,title,introduction,sections,status) values($1,$2,$3,$4,$5) on conflict(slug) do nothing returning *`,
      [
        content.slug,
        content.title,
        content.introduction,
        JSON.stringify(content.sections),
        content.status,
      ],
    );
    if (d)
      await db.query(
        `insert into community_versions(document_id,version,title,introduction,sections,status) values($1,$2,$3,$4,$5,$6)`,
        [
          d.id,
          d.version,
          d.title,
          d.introduction,
          JSON.stringify(d.sections),
          d.status,
        ],
      );
    await db.query("commit");
    console.log(
      d
        ? "Proposition publiée, version 1."
        : "Document déjà présent, contenu conservé.",
    );
  } catch (e) {
    await db.query("rollback");
    throw e;
  } finally {
    await db.end();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
