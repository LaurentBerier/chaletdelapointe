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
  postIds = [];
const headers = {
  apikey: key,
  Authorization: "Bearer " + key,
  "Content-Type": "application/json",
};
async function create(role) {
  const email = "blog." + role + "." + run + "@example.test";
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
  const r = await fetch(site + "/api" + path, {
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
    const member = await create("member"),
      other = await create("other"),
      admin = await create("admin"),
      pending = await create("pending");
    const input = {
      title: "Chronique essai " + run,
      excerpt: "Un récit partagé.",
      content: "Une belle journée au chalet.",
      published: true,
    };
    await api(null, "/account/articles", "POST", input, 401);
    await api(pending, "/account/articles", "POST", input, 403);
    const post = await api(member, "/account/articles", "POST", input, 201);
    postIds.push(post.id);
    const otherPost = await api(
      other,
      "/account/articles",
      "POST",
      { ...input, title: "Autre chronique " + run },
      201,
    );
    postIds.push(otherPost.id);
    const comments = "/account/blog/" + post.slug + "/comments",
      commentPath = (id) => "/account/blog/comments/" + id;
    assert.ok((await api(null, "/journal")).some((p) => p.id === post.id));
    assert.ok(
      !(await api(other, "/account/articles")).some((p) => p.id === post.id),
    );
    await api(other, "/account/articles/" + post.id, "PATCH", input, 404);
    await api(member, "/account/articles/" + post.id, "PATCH", {
      ...input,
      content: "Récit corrigé.",
    });
    await api(null, comments, "GET", undefined, 401);
    await api(pending, comments, "POST", { body: "Refusé" }, 403);
    const c = await api(
      other,
      comments,
      "POST",
      { body: "Très belle journée !" },
      201,
    );
    await api(
      member,
      "/account/blog/" + otherPost.slug + "/comments",
      "POST",
      { body: "Mauvais parent", parentId: c.id },
      400,
    );
    await api(
      member,
      comments,
      "POST",
      { body: "Merci !", parentId: c.id },
      201,
    );
    await api(
      member,
      commentPath(c.id),
      "PATCH",
      { body: "Interdit", updatedAt: null },
      403,
    );
    await api(
      admin,
      commentPath(c.id),
      "PATCH",
      { body: "Ne pas réécrire un autre auteur", updatedAt: null },
      403,
    );
    await api(other, commentPath(c.id), "PATCH", {
      body: "Très belle journée ensemble !",
      updatedAt: null,
    });
    await api(
      other,
      commentPath(c.id),
      "PATCH",
      { body: "Texte périmé", updatedAt: null },
      409,
    );
    await api(member, commentPath(c.id), "PATCH", { action: "remove" }, 403);
    await api(admin, commentPath(c.id), "PATCH", { action: "remove" });
    let thread = (await api(member, comments)).comments[0];
    assert.equal(thread.body, "");
    assert.equal(thread.replies.length, 1);
    assert.equal(
      (await api(admin, comments)).comments[0].body,
      "Très belle journée ensemble !",
    );
    await api(other, commentPath(c.id), "PATCH", { action: "restore" }, 403);
    await api(admin, commentPath(c.id), "PATCH", { action: "restore" });
    await api(
      member,
      "/admin/articles/" + post.id + "/moderation",
      "POST",
      { action: "lock" },
      403,
    );
    await api(admin, "/admin/articles/" + post.id + "/moderation", "POST", {
      action: "lock",
    });
    await api(member, comments, "POST", { body: "Fermé" }, 409);
    assert.equal((await api(member, comments)).locked, true);
    await api(admin, "/admin/articles/" + post.id + "/moderation", "POST", {
      action: "unlock",
    });
    await api(member, "/admin/articles/" + post.id, "DELETE", {}, 403);
    await api(admin, "/admin/articles/" + post.id, "DELETE", {});
    assert.ok(!(await api(null, "/journal")).some((p) => p.id === post.id));
    await api(member, "/account/articles/" + post.id, "PATCH", input, 404);
    await api(other, comments, "GET", undefined, 404);
    await api(member, comments, "POST", { body: "Article retiré" }, 404);
    await api(
      member,
      "/admin/articles/" + post.id + "/moderation",
      "POST",
      { action: "restore" },
      403,
    );
    await api(admin, "/admin/articles/" + post.id + "/moderation", "POST", {
      action: "restore",
    });
    assert.ok(!(await api(null, "/journal")).some((p) => p.id === post.id));
    await api(member, "/account/articles/" + post.id, "PATCH", input);
    assert.deepEqual(
      (
        await db.query(
          "select has_table_privilege('anon','blog_comments','select') a,has_table_privilege('authenticated','blog_comments','insert') b",
        )
      ).rows[0],
      { a: false, b: false },
    );
    console.log(
      "API: member publishing, own edits, private comments, locks, removal and admin-only restoration OK.",
    );
    if (executablePath) {
      browser = await require("puppeteer-core").launch({
        headless: true,
        pipe: true,
        executablePath,
      });
      async function login(who, destination) {
        const context = await browser.createBrowserContext(),
          page = await context.newPage();
        page.setDefaultTimeout(15000);
        page.on("pageerror", (e) => console.error("Browser error:", e.message));
        await page.setViewport({ width: 1280, height: 900 });
        await page.goto(site + destination);
        await page.waitForSelector("[data-testid=input-email]");
        await page.type("[data-testid=input-email]", who.email);
        await page.type("input[type=password]", password);
        await page.click("[data-testid=button-submit]");
        return page;
      }
      const page = await login(member, "/tableau-de-bord?onglet=blogue");
      await page.waitForSelector(".panel-heading button");
      await page.click(".panel-heading button");
      await page.waitForSelector("input[name=published]");
      await page.type("input[name=title]", "Publication navigateur " + run);
      await page.type("textarea[name=excerpt]", "Essai du formulaire.");
      await page.type(
        "textarea[name=content]",
        "Un récit publié par un membre.",
      );
      await page.click("input[name=published]");
      const saved = page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/account/articles") &&
          r.request().method() === "POST",
      );
      await page.click("form.account-form button.action");
      const r = await saved;
      assert.equal(r.status(), 201);
      const created = await r.json();
      postIds.push(created.id);
      assert.equal(created.published, true);
      await page.goto(site + "/blogue/" + post.slug);
      await page.waitForSelector("#commentaires textarea").catch(async (e) => {
        console.error(
          "Article screen:",
          await page.$eval("body", (b) => b.innerText),
        );
        throw e;
      });
      await page.type(
        "#commentaires textarea",
        "Commentaire navigateur " + run,
      );
      await page.click("#commentaires form .community-button");
      await page.waitForFunction(
        (run) =>
          document
            .querySelector("#commentaires .community-message")
            ?.textContent.includes(run),
        {},
        run,
      );
      assert.equal(
        await page.$$eval("#commentaires button", (b) =>
          b.some((x) => x.textContent.includes("Rétablir")),
        ),
        false,
      );
      const adminPage = await login(
        admin,
        "/connexion?suite=blogue&article=" + post.slug,
      );
      await adminPage.waitForSelector("#commentaires .community-message");
      assert.ok(adminPage.url().includes("/blogue/" + post.slug));
      adminPage.on("dialog", (d) => d.accept());
      await adminPage.$$eval(
        "#commentaires .community-message-actions button",
        (b) => b.find((x) => x.textContent === "Retirer").click(),
      );
      await adminPage.waitForFunction(() =>
        [...document.querySelectorAll("#commentaires button")].some(
          (b) => b.textContent === "Rétablir le commentaire",
        ),
      );
      fs.mkdirSync(".local/community-review", { recursive: true });
      await adminPage.$eval("#commentaires", (el) => el.scrollIntoView());
      await adminPage.screenshot({
        path: ".local/community-review/blog-desktop.png",
      });
      await adminPage.setViewport({
        width: 375,
        height: 812,
        isMobile: true,
        hasTouch: true,
      });
      await adminPage.waitForSelector("#commentaires .community-message");
      await adminPage.$eval("#commentaires", (el) => el.scrollIntoView());
      assert.ok(
        await adminPage.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      await adminPage.screenshot({
        path: ".local/community-review/blog-mobile.png",
      });
      console.log(
        "Browser: member publication/comment, sign-in return, admin removal and responsive layout OK.",
      );
    }
  } finally {
    if (browser) await browser.close();
    await db.query(
      "delete from blog_comments where post_id=any($1::uuid[]) and parent_id is not null",
      [postIds],
    );
    await db.query("delete from blog_posts where id=any($1::uuid[])", [
      postIds,
    ]);
    const ids = (
      await db.query(
        "select id from users where auth_user_id=any($1::uuid[])",
        [accounts],
      )
    ).rows.map((x) => x.id);
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
