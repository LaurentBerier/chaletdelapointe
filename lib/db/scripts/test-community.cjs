// Generated accounts and documents on a disposable local stack only.
const assert = require("node:assert/strict"),
  { randomUUID } = require("node:crypto"),
  { Client } = require("pg");
const fs = require("node:fs");
const {
  DATABASE_URL,
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY: anon,
  CHALET_TEST_AUTH_ADMIN_KEY: key,
  CHALET_TEST_SITE: site,
  CHALET_TEST_CHROMIUM: executablePath,
} = process.env;
if (
  ![DATABASE_URL, SUPABASE_URL, site].every(
    (s) => s && ["127.0.0.1", "localhost"].includes(new URL(s).hostname),
  ) ||
  !key
)
  throw Error("Local test stack required");
const db = new Client({ connectionString: DATABASE_URL }),
  run = randomUUID().slice(0, 8),
  password = randomUUID() + "Qa1",
  accounts = [],
  documents = [];
const headers = {
  apikey: key,
  Authorization: "Bearer " + key,
  "Content-Type": "application/json",
};
async function create(role) {
  const email = "community." + role + "." + run + "@example.test";
  const r = await fetch(SUPABASE_URL + "/auth/v1/admin/users", {
    method: "POST",
    headers,
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: "Essai " + role,
        declared_relation: "ami_famille",
      },
    }),
  });
  assert.ok(r.ok, await r.clone().text());
  const { id } = await r.json();
  accounts.push(id);
  if (role !== "pending")
    await db.query(
      `update users set account_status='approved',is_disabled=false,"group"=$2,is_reservation_admin=$3,is_admin=$4 where auth_user_id=$1`,
      [
        id,
        role.startsWith("owner") ? "proprietaire" : "public",
        role === "admin",
        role === "super",
      ],
    );
  const {
    rows: [u],
  } = await db.query("select id from users where auth_user_id=$1", [id]);
  const login = await fetch(
    SUPABASE_URL + "/auth/v1/token?grant_type=password",
    {
      method: "POST",
      headers: { apikey: anon, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    },
  );
  assert.ok(login.ok);
  return { ...u, email, token: (await login.json()).access_token };
}
async function api(u, path, method = "GET", body, status = 200) {
  const r = await fetch(site + "/api/community" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(u ? { Authorization: "Bearer " + u.token } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const value = await r.json();
  assert.equal(
    r.status,
    status,
    method + " " + path + ": " + JSON.stringify(value),
  );
  return value;
}
async function main() {
  await db.connect();
  let browser;
  try {
    const owner = await create("owner"),
      other = await create("owner2"),
      admin = await create("admin"),
      superUser = await create("super"),
      member = await create("member"),
      pending = await create("pending");
    await api(null, "/documents", "GET", undefined, 401);
    await api(pending, "/threads", "GET", undefined, 403);
    await api(member, "/documents", "GET", undefined, 403);
    const input = {
      title: "Règlement test " + run,
      introduction: "Proposition pour les essais locaux.",
      status: "discussion",
      sections: [
        { id: "ete", title: "Les meilleures dates", body: "Texte original." },
        {
          id: "construction",
          title: "Les vacances de la construction",
          body: "Priorité aux travailleurs concernés.",
        },
      ],
    };
    await api(owner, "/documents", "POST", input, 403);
    let d = await api(admin, "/documents", "POST", input);
    documents.push(d.id);
    const path = "/documents/" + d.slug;
    await api(owner, path);
    await api(member, path, "GET", undefined, 403);
    await api(member, path + "/versions/1", "GET", undefined, 403);
    await api(owner, path, "PATCH", { ...d, title: "Tentative" }, 403);
    const suggestion = await api(owner, "/messages", "POST", {
      documentId: d.id,
      version: d.version,
      sectionKey: "ete",
      kind: "suggestion",
      body: "Je propose une rotation chaque année.",
      proposedText:
        "Les meilleures semaines changent de propriétaire chaque année.",
    });
    await api(member, "/threads?document=" + d.id, "GET", undefined, 403);
    await api(
      member,
      "/messages",
      "POST",
      { parentId: suggestion.id, body: "Accès interdit" },
      403,
    );
    await api(
      other,
      "/messages/" + suggestion.id,
      "PATCH",
      {
        body: "Modification interdite",
        proposedText: "Autre texte",
        updatedAt: null,
      },
      403,
    );
    await api(other, "/messages/" + suggestion.id, "DELETE", {}, 403);
    const reply = await api(other, "/messages", "POST", {
      parentId: suggestion.id,
      body: "Cette rotation me convient.",
    });
    assert.equal((await api(owner, "/notifications")).length, 1);
    await db.query(`update users set "group"='public' where id=$1`, [owner.id]);
    assert.equal((await api(owner, "/notifications")).length, 0);
    await api(
      owner,
      "/messages/" + suggestion.id + "/follow",
      "POST",
      { following: false },
      403,
    );
    await db.query(`update users set "group"='proprietaire' where id=$1`, [
      owner.id,
    ]);
    await api(
      owner,
      "/messages/" + suggestion.id + "/apply",
      "POST",
      { version: 1 },
      403,
    );
    d = await api(admin, "/messages/" + suggestion.id + "/apply", "POST", {
      version: 1,
    });
    assert.equal(d.version, 2);
    assert.equal(
      d.sections[0].body,
      "Les meilleures semaines changent de propriétaire chaque année.",
    );
    await api(
      admin,
      "/messages/" + suggestion.id + "/apply",
      "POST",
      { version: 2 },
      409,
    );
    assert.equal(
      (await api(owner, path + "/versions/1")).sections[0].body,
      "Texte original.",
    );
    await api(admin, path, "PATCH", { ...d, version: 1 }, 409);
    await api(
      owner,
      "/messages/" + suggestion.id,
      "PATCH",
      { body: "Réécriture", proposedText: "X", updatedAt: null },
      409,
    );
    const s2 = await api(other, "/messages", "POST", {
      documentId: d.id,
      version: 2,
      sectionKey: "ete",
      kind: "suggestion",
      body: "Autre idée",
      proposedText: "Texte alternatif.",
    });
    d = await api(superUser, path, "PATCH", {
      ...d,
      sections: [
        { ...d.sections[0], body: "Texte modifié par un admin." },
        d.sections[1],
      ],
    });
    await api(
      admin,
      "/messages/" + s2.id + "/apply",
      "POST",
      { version: d.version },
      409,
    );
    const conflict = await Promise.all([
      fetch(site + "/api/community" + path, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + admin.token,
        },
        body: JSON.stringify({ ...d, title: "Version concurrente A" }),
      }),
      fetch(site + "/api/community" + path, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + superUser.token,
        },
        body: JSON.stringify({ ...d, title: "Version concurrente B" }),
      }),
    ]);
    assert.deepEqual(conflict.map((r) => r.status).sort(), [200, 409]);
    d = await api(owner, path);
    const comment = await api(owner, "/messages", "POST", {
      documentId: d.id,
      version: d.version,
      body: "Note générale",
    });
    await api(owner, "/messages/" + comment.id, "PATCH", {
      body: "Note corrigée",
      updatedAt: null,
    });
    await api(
      owner,
      "/messages/" + comment.id,
      "PATCH",
      { body: "Édition périmée", updatedAt: null },
      409,
    );
    await api(other, "/messages", "POST", {
      parentId: comment.id,
      body: "Réponse conservée",
    });
    await api(owner, "/messages/" + comment.id, "DELETE", {});
    const deleted = (
      await api(owner, "/threads?document=" + d.id + "&thread=" + comment.id)
    ).threads[0];
    assert.equal(deleted.body, "");
    assert.equal(deleted.replies.length, 1);
    const general = await api(member, "/messages", "POST", {
      title: "Sujet public aux membres " + run,
      body: "Discussion entre utilisateurs approuvés.",
    });
    await api(owner, "/messages", "POST", {
      parentId: general.id,
      body: "Réponse du propriétaire",
    });
    assert.equal((await api(member, "/notifications")).length, 1);
    await api(member, "/messages/" + general.id + "/follow", "POST", {
      following: false,
    });
    await api(owner, "/messages", "POST", {
      parentId: general.id,
      body: "Une autre réponse",
    });
    assert.equal((await api(member, "/notifications")).length, 1);
    await api(admin, "/messages/" + general.id, "DELETE", {});
    assert.equal(
      (await api(member, "/threads?thread=" + general.id)).threads.length,
      0,
    );
    assert.equal((await api(member, "/notifications")).length, 0);
    await api(
      member,
      "/messages",
      "POST",
      { parentId: general.id, body: "Discussion retirée" },
      409,
    );
    const grants = await db.query(
      "select has_table_privilege('anon','community_documents','select') as a,has_table_privilege('authenticated','community_messages','insert') as b",
    );
    assert.deepEqual(grants.rows[0], { a: false, b: false });
    console.log(
      "API: permissions, suggestions, versions, concurrent edits, notifications and privacy OK.",
    );
    if (executablePath) {
      browser = await require("puppeteer-core").launch({
        headless: true,
        pipe: true,
        executablePath,
      });
      async function login(who) {
        const context = await browser.createBrowserContext(),
          page = await context.newPage();
        page.setDefaultTimeout(15000);
        await page.setViewport({ width: 1280, height: 900 });
        await page.goto(site + "/tableau-de-bord?onglet=vie");
        await page.waitForSelector("[data-testid=input-email]");
        await page.type("[data-testid=input-email]", who.email);
        await page.type("input[type=password]", password);
        await page.click("[data-testid=button-submit]");
        await page.waitForSelector(".community-library,.community-threads");
        return page;
      }
      const p = await login(owner);
      await p.goto(
        site + "/tableau-de-bord?onglet=vie&document=politique-de-reservation",
      );
      await p.waitForSelector(".community-paper");
      assert.equal(
        await p.$$eval("button", (b) =>
          b.some((x) => x.textContent === "Modifier le document"),
        ),
        false,
      );
      const suggest = await p.evaluateHandle(() =>
        [
          ...document.querySelectorAll(".community-section-actions button"),
        ].find((b) => b.textContent.includes("Suggérer")),
      );
      await suggest.click();
      await p.waitForSelector('#community-composer textarea[rows="9"]');
      const sent = await p.$('#community-composer textarea[rows="3"]');
      await sent.type("Suggestion temporaire pour vérifier le parcours.");
      await p.click("#community-composer .community-button");
      await p.waitForFunction(() =>
        document
          .querySelector(".community-message")
          ?.textContent.includes("Suggestion temporaire"),
      );
      assert.equal(
        await p.$$eval("button", (b) =>
          b.some((x) => x.textContent === "Intégrer au règlement"),
        ),
        false,
      );
      fs.mkdirSync(".local/community-review", { recursive: true });
      await p.evaluate(() => scrollTo(0, 0));
      await p.screenshot({ path: ".local/community-review/desktop.png" });
      await p.setViewport({
        width: 375,
        height: 812,
        isMobile: true,
        hasTouch: true,
      });
      await p.waitForSelector(".community-paper");
      await p.evaluate(() => scrollTo(0, 0));
      assert.ok(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      await p.screenshot({ path: ".local/community-review/mobile.png" });
      const a = await login(admin);
      await a.goto(site + "/tableau-de-bord?onglet=vie&document=" + d.slug);
      await a.waitForSelector(".community-paper");
      assert.ok(
        await a.$$eval("button", (b) =>
          b.some((x) => x.textContent === "Modifier le document"),
        ),
      );
      const editor = await a.evaluateHandle(() =>
        [...document.querySelectorAll("button")].find(
          (b) => b.textContent === "Modifier le document",
        ),
      );
      await editor.click();
      await a.waitForSelector(".community-editor");
      assert.equal(
        await a.$eval(".community-editor input", (e) => e.value),
        d.title,
      );
      await a.setViewport({
        width: 375,
        height: 812,
        isMobile: true,
        hasTouch: true,
      });
      await a.waitForSelector(".community-paper");
      assert.ok(
        await a.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      const m = await login(member);
      assert.equal(await m.$(".community-document-card"), null);
      await m.goto(site + "/tableau-de-bord?onglet=vie&document=" + d.slug);
      await m.waitForSelector(".community-error");
      assert.equal(await m.$(".community-paper"), null);
      console.log(
        "Browser: owner suggestions, admin editor, member privacy and desktop/mobile layout OK.",
      );
    }
    d = await api(admin, path, "PATCH", { ...d, status: "archived" });
    await api(
      owner,
      "/messages",
      "POST",
      { documentId: d.id, version: d.version, body: "Test archivé" },
      409,
    );
  } finally {
    if (browser) await browser.close();
    const ids = (
      await db.query(
        "select id from users where auth_user_id=any($1::uuid[])",
        [accounts],
      )
    ).rows.map((x) => x.id);
    await db.query(
      "delete from community_messages where parent_id in (select id from community_messages where author_id=any($1::uuid[])) or author_id=any($1::uuid[]) and parent_id is not null",
      [ids],
    );
    await db.query(
      "delete from community_messages where author_id=any($1::uuid[])",
      [ids],
    );
    await db.query("delete from community_documents where id=any($1::uuid[])", [
      documents,
    ]);
    for (const id of accounts)
      await fetch(SUPABASE_URL + "/auth/v1/admin/users/" + id, {
        method: "DELETE",
        headers,
      });
    await db.query(
      "delete from access_emails where member_id=any($1::uuid[]) or recipient_id=any($1::uuid[])",
      [ids],
    );
    await db.query("delete from users where id=any($1::uuid[])", [ids]);
    await db.end();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
