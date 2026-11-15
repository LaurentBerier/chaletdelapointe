const assert = require("node:assert/strict"),
  crypto = require("node:crypto"),
  pg = require("pg");
const base = process.env.CHALET_TEST_SITE,
  authBase = process.env.SUPABASE_URL,
  dbUrl = process.env.DATABASE_URL,
  mailBase = process.env.CHALET_TEST_MAILPIT;
if (
  ![base, authBase, dbUrl, mailBase].every(
    (s) => s && ["127.0.0.1", "localhost"].includes(new URL(s).hostname),
  ) ||
  !process.env.SUPABASE_PUBLISHABLE_KEY
)
  throw Error(
    "Use a disposable local chalet database, Auth, Mailpit and site (loopback only).",
  );
const c = {
  DB_URL: dbUrl,
  API_URL: authBase,
  PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
};
const db = new pg.Client({ connectionString: c.DB_URL }),
  root = new URL("/api", base).href,
  auth = c.API_URL + "/auth/v1",
  mail = new URL("/api/v1", mailBase).href,
  created = [],
  postIds = [],
  password = crypto.randomUUID() + "-Qa",
  run = Date.now();
let stay;
async function req(url, method = "GET", body, token, authReq = false) {
  const r = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(authReq ? { apikey: c.PUBLISHABLE_KEY } : {}),
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let out = await r.text();
  try {
    out = JSON.parse(out);
  } catch {}
  return { status: r.status, data: out };
}
async function check(
  url,
  status = 200,
  method = "GET",
  body,
  token,
  authReq = false,
) {
  const r = await req(url, method, body, token, authReq);
  assert.equal(
    r.status,
    status,
    method +
      " " +
      url.split("?")[0] +
      " " +
      (r.data?.error || r.data?.msg || r.status),
  );
  return r.data;
}
async function sign(label) {
  const email = "chalet-qa-" + run + "-" + label + "@example.test";
  const result = await check(
    auth + "/signup",
    200,
    "POST",
    { email, password, data: { display_name: "Essai " + label } },
    null,
    true,
  );
  created.push(result.id);
  let m;
  for (let i = 0; i < 15 && !m; i++) {
    const inbox = await check(mail + "/messages");
    m = inbox.messages.find((m) => m.To?.some((t) => t.Address === email));
    if (!m) await new Promise((r) => setTimeout(r, 200));
  }
  assert.ok(m);
  const letter = await check(mail + "/message/" + m.ID);
  const link = letter.HTML.match(
    /href="([^"]+\/verify\?[^"]+)"/i,
  )[1].replaceAll("&amp;", "&");
  const u = new URL(link);
  await check(
    auth + "/verify",
    200,
    "POST",
    {
      token_hash: u.searchParams.get("token"),
      type: u.searchParams.get("type"),
    },
    null,
    true,
  );
  return (
    await check(
      auth + "/token?grant_type=password",
      200,
      "POST",
      { email, password },
      null,
      true,
    )
  ).access_token;
}
(async () => {
  await db.connect();
  try {
    const admin = await sign("a"),
      member = await sign("m");
    await db.query(
      "update public.users set is_admin=true,can_approve=true,\"group\"='proprietaire' where auth_user_id=$1",
      [created[0]],
    );
    const self = await check(root + "/me", 200, "GET", null, member);
    assert.equal(self.name, "Essai m");
    assert.equal(self.isOwner, false);
    await check(root + "/admin/accounts", 403, "GET", null, member);
    await check(root + "/admin/accounts", 401);
    await check(root + "/reservations", 403, "GET", null, member);
    const adminProfile = await check(root + "/me", 200, "GET", null, admin);
    await check(
      root + "/admin/accounts/" + adminProfile.id,
      409,
      "PATCH",
      { group: "public", canApprove: false, isDisabled: true },
      admin,
    );
    const account = await check(
      root + "/admin/accounts",
      200,
      "GET",
      null,
      admin,
    );
    const m = account.find((x) => x.id === self.id);
    const grant = async (group, isDisabled = false) =>
      check(
        root + "/admin/accounts/" + m.id,
        200,
        "PATCH",
        { group, isDisabled, canApprove: false },
        admin,
      );
    let p = await check(
      root + "/account/articles",
      201,
      "POST",
      { title: "QA privé", excerpt: "Essai", content: "Brouillon privé" },
      member,
    );
    postIds.push(p.id);
    assert.ok(!(await check(root + "/journal")).some((x) => x.id === p.id));
    await check(
      root + "/account/articles/" + p.id,
      200,
      "PATCH",
      { ...p, published: true },
      admin,
    );
    await check(root + "/me", 200, "PATCH", { name: "Nom de plume" }, member);
    assert.equal(
      (await check(root + "/journal")).find((x) => x.id === p.id).author,
      "Nom de plume",
    );
    await grant("proprietaire");
    const [prop] = await check(root + "/properties");
    const range = { startDate: "2034-12-21", endDate: "2034-12-23" };
    const booking = await check(
      root + "/reservations",
      201,
      "POST",
      { propertyId: prop.id, guests: 2, ...range },
      member,
    );
    stay = booking.id;
    await check(
      root + "/reviews/" + stay,
      200,
      "POST",
      { decision: "approve" },
      admin,
    );
    const cal = root + "/calendar/" + prop.id;
    assert.equal(
      (await check(cal, 200, "GET", null, member)).find(
        (x) => x.startDate === range.startDate,
      ).ownerName,
      "Nom de plume",
    );
    assert.ok((await check(cal)).every((x) => !("ownerName" in x)));
    await check(
      root + "/admin/reservations/" + stay,
      200,
      "PATCH",
      { endDate: "2034-12-24", guests: 3 },
      admin,
    );
    await check(
      root + "/admin/reservations/" + stay,
      400,
      "PATCH",
      { guests: prop.maxGuests + 1 },
      admin,
    );
    await grant("public");
    assert.ok(
      (await check(cal, 200, "GET", null, member)).every(
        (x) => !("ownerName" in x),
      ),
    );
    await grant("public", true);
    await check(root + "/me", 403, "GET", null, member);
    await check(
      root + "/admin/properties/" + prop.id,
      200,
      "PATCH",
      {
        name: prop.name,
        description: prop.description,
        maxGuests: prop.maxGuests,
      },
      admin,
    );
    const recoveryEmail = "chalet-qa-" + run + "-m@example.test";
    await check(
      auth + "/recover",
      200,
      "POST",
      { email: recoveryEmail },
      null,
      true,
    );
    const letters = (await check(mail + "/messages")).messages;
    const rmail = letters.find(
      (m) =>
        m.To.some((t) => t.Address === recoveryEmail) &&
        /reset|passe/i.test(m.Subject),
    );
    assert.ok(rmail);
    const recoveryMsg = await check(mail + "/message/" + rmail.ID);
    const recoveryURL = new URL(
      recoveryMsg.HTML.match(/href="([^"]+\/verify\?[^"]+)"/i)[1].replaceAll(
        "&amp;",
        "&",
      ),
    );
    const session = await check(
      auth + "/verify",
      200,
      "POST",
      { token_hash: recoveryURL.searchParams.get("token"), type: "recovery" },
      null,
      true,
    );
    const replacement = crypto.randomUUID() + "-new";
    await check(
      auth + "/user",
      200,
      "PUT",
      { password: replacement },
      session.access_token,
      true,
    );
    await check(
      auth + "/token?grant_type=password",
      200,
      "POST",
      { email: recoveryEmail, password: replacement },
      null,
      true,
    );
    console.log(
      "PASS: recovery and new-password sign-in, super-admin protection, signup and confirmation, password login, member permissions, profile byline, drafts/publication, promotion, approval, private names, booking edits, capacity, suspension, chalet settings.",
    );
  } finally {
    if (stay) {
      for (const table of ["booking_emails", "admin_actions"])
        await db.query("delete from " + table + " where reservation_id=$1", [
          stay,
        ]);
      await db.query("delete from reservations where id=$1", [stay]);
    }
    await db.query("delete from blog_posts where id=any($1::uuid[])", [
      postIds,
    ]);
    await db.query(
      "delete from public.users where auth_user_id=any($1::uuid[])",
      [created],
    );
    await db.query("delete from auth.users where id=any($1::uuid[])", [
      created,
    ]);
    await db.end();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
