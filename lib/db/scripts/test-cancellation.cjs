// All fixtures and emails are confined to a disposable loopback stack.
Error.stackTraceLimit = 60;
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { mkdirSync } = require("node:fs");
const { Client } = require("pg");
const {
  DATABASE_URL,
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  CHALET_TEST_SITE: site,
  CHALET_TEST_AUTH_ADMIN_KEY: key,
  CHALET_TEST_CHROMIUM: executablePath,
} = process.env;
if (
  ![DATABASE_URL, SUPABASE_URL, site].every(
    (u) => u && ["localhost", "127.0.0.1"].includes(new URL(u).hostname),
  ) ||
  !key
)
  throw Error("Use disposable local test services only.");
const db = new Client({ connectionString: DATABASE_URL });
const accounts = [],
  stays = [],
  run = randomUUID().slice(0, 8),
  password = randomUUID() + "Qa1";
let browser, property;
async function create(label, role = "member") {
  const email = `cancel-${label}.${run}@example.test`;
  const response = await fetch(SUPABASE_URL + "/auth/v1/admin/users", {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: label + " " + run,
        can_cancel_others: true,
      },
    }),
  });
  assert.ok(response.ok, "create test identity");
  const { id } = await response.json();
  accounts.push(id);
  if (role !== "pending")
    await db.query(
      `update users set account_status='approved',is_disabled=false,is_admin=$2,is_reservation_admin=$3,
      "group"=$4,can_approve=$5 where auth_user_id=$1`,
      [
        id,
        role === "super",
        role === "admin",
        role === "committee" ? "proprietaire" : "public",
        role === "committee",
      ],
    );
  const {
    rows: [row],
  } = await db.query(
    "select id,registration_request_id,can_cancel_others from users where auth_user_id=$1",
    [id],
  );
  assert.equal(
    row.can_cancel_others,
    false,
    "signup metadata never grants cancellation",
  );
  const token = await fetch(
    SUPABASE_URL + "/auth/v1/token?grant_type=password",
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    },
  );
  assert.ok(token.ok);
  return { ...row, email, token: (await token.json()).access_token };
}
async function api(who, path, method = "GET", body, expected = 200) {
  const response = await fetch(site + "/api" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(who ? { Authorization: "Bearer " + who.token } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  assert.equal(
    response.status,
    expected,
    `${method} ${path}: ${JSON.stringify(data)}`,
  );
  return data;
}
async function fixture(who, status = "confirmed", start) {
  const day =
    start ??
    new Date(Date.UTC(2040, 0, 1 + stays.length * 2))
      .toISOString()
      .slice(0, 10);
  const {
    rows: [row],
  } = await db.query(
    `insert into reservations(property_id,user_id,start_date,end_date,guests,nights,subtotal,total,season_breakdown,status,notes)
     values($1,$2,$3::date,$3::date+1,1,1,0,0,'[]',$4,'Private test note') returning id,start_date::text`,
    [property.id, who.id, day, status],
  );
  stays.push(row.id);
  return row;
}
const patch = (canCancelOthers) => ({
  group: "public",
  canApprove: false,
  isDisabled: false,
  canCancelOthers,
});
async function evidence(stay, actor, sent = true) {
  const { rows: audit } = await db.query(
    "select admin_user_id,details from admin_actions where reservation_id=$1 and action_type='cancel'",
    [stay.id],
  );
  assert.equal(audit.length, 1, "one cancellation audit");
  assert.equal(audit[0].admin_user_id, actor.id);
  const { rows: messages } = await db.query(
    "select recipient,sent_at,body from booking_emails where reservation_id=$1 and subject like '%annulée'",
    [stay.id],
  );
  assert.equal(
    messages.length,
    sent ? 1 : 0,
    "one cancellation email except drafts",
  );
  if (sent) assert.ok(messages[0].sent_at, "local email was delivered");
  return { audit: audit[0], message: messages[0] };
}
async function uiChecks(lead, member, delegate) {
  browser = await require("puppeteer-core").launch({
    executablePath,
    headless: true,
    protocolTimeout: 15000,
    timeout: 15000,
  });
  const phone = { width: 375, height: 812, isMobile: true, hasTouch: true };
  async function login(who, tab) {
    const ctx = await browser.createBrowserContext(),
      page = await ctx.newPage();
    page.setDefaultTimeout(15000);
    await page.setViewport(phone);
    await page.goto(site + "/tableau-de-bord?onglet=" + tab);
    await page.waitForSelector("[data-testid=input-email]");
    await page.type("[data-testid=input-email]", who.email);
    await page.type("input[type=password]", password);
    await page.click("[data-testid=button-submit]");
    await page.waitForSelector(".welcome-copy");
    return page;
  }
  async function clickText(page, selector, text) {
    const handle = await page.evaluateHandle(
      (selector, text) =>
        [...document.querySelectorAll(selector)].find(
          (el) => el.textContent.trim() === text,
        ),
      selector,
      text,
    );
    assert.ok(handle.asElement(), text);
    await page.locator("aria/" + text).click();
  }
  async function directoryRow(page) {
    await page.waitForFunction(
      (email) =>
        [...document.querySelectorAll("details.panel")].some((el) =>
          el.textContent.includes(email),
        ),
      {},
      delegate.email,
    );
    const rows = await page.$$("details.panel");
    for (const row of rows) {
      if (
        await row.evaluate(
          (el, email) => el.textContent.includes(email),
          delegate.email,
        )
      ) {
        await (await row.$("summary")).click();
        return row;
      }
    }
    throw Error("Delegate account not found");
  }
  console.log("Checking super-admin permission control…");
  const adminPage = await login(lead, "comptes");
  const row = await directoryRow(adminPage);
  assert.equal(
    await row.$eval("input[name=cancelOthers]", (el) => el.checked),
    false,
  );
  await (await row.$("input[name=cancelOthers]")).click();
  await (await row.$("button.action")).click();
  await adminPage.waitForFunction(() =>
    document
      .querySelector("details[open] .feedback")
      ?.textContent.includes("enregistrées"),
  );
  assert.equal((await api(delegate, "/me")).canCancelOthers, true);
  mkdirSync("/tmp/chalet-cancellation-qa", { recursive: true });
  await adminPage.setViewport({ width: 1280, height: 1000 });
  const desktopRow = await directoryRow(adminPage);
  await desktopRow.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await adminPage.screenshot({
    path: "/tmp/chalet-cancellation-qa/permission.png",
  });

  console.log("Checking own cancellation on desktop and phone…");
  const own = await fixture(member, "pending_approval");
  const page = await login(member, "reservations");
  await page.waitForSelector(".stay-cancel-link");
  for (const viewport of [{ width: 1280, height: 900 }, phone]) {
    await page.setViewport(viewport);
    await page.waitForSelector(".stay-cancel-link");
    assert.ok(
      await page.$("[data-testid=tab-reservations]"),
      "own stays available without booking rights",
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "no horizontal overflow",
    );
  }
  await clickText(page, "button", "Annuler mon séjour…");
  await page.waitForSelector("[role=alertdialog]");
  await clickText(page, "[role=alertdialog] button", "Garder la réservation");
  assert.equal(
    (await api(member, "/reservations/" + own.id)).status,
    "pending_approval",
  );
  await clickText(page, "button", "Annuler mon séjour…");
  await page.waitForSelector("[role=alertdialog]");
  await page.screenshot({ path: "/tmp/chalet-cancellation-qa/own-mobile.png" });
  await clickText(page, "[role=alertdialog] button", "Confirmer l’annulation");
  await page.waitForSelector("[role=alertdialog]", { hidden: true });
  await page.waitForSelector(".stay-cancel-link", { hidden: true });
  await evidence(own, member);

  console.log("Checking delegate cancellation and revocation…");
  const other = await fixture(member);
  const delegated = await login(delegate, "sejours");
  await delegated.waitForSelector(".account-content details");
  assert.deepEqual(
    await delegated.$$eval('[data-group="staff"] a', (els) =>
      els.map((el) => el.dataset.testid),
    ),
    ["tab-sejours"],
  );
  const target = await delegated.$(".account-content details");
  await (await target.$("summary")).click();
  assert.equal(
    await target.$("input[name=startDate]"),
    null,
    "delegate cannot edit dates",
  );
  await clickText(delegated, "details[open] button", "Annuler la réservation…");
  await delegated.waitForSelector("[role=alertdialog]");
  await clickText(
    delegated,
    "[role=alertdialog] button",
    "Confirmer l’annulation",
  );
  await delegated.waitForFunction(
    () =>
      document.querySelector("details[open] .badge")?.textContent === "Annulée",
  );
  await evidence(other, delegate);
  await adminPage.reload();
  const refreshed = await directoryRow(adminPage);
  await (await refreshed.$("input[name=cancelOthers]")).click();
  await (await refreshed.$("button.action")).click();
  await adminPage.waitForFunction(() =>
    document
      .querySelector("details[open] .feedback")
      ?.textContent.includes("enregistrées"),
  );
  await api(delegate, "/cancellations", "GET", undefined, 403);
  await delegated.reload();
  await delegated.waitForSelector(".welcome-copy");
  assert.equal(await delegated.$("[data-testid=tab-sejours]"), null);
}
async function runTests() {
  await db.connect();
  try {
    const lead = await create("super", "super"),
      member = await create("member"),
      other = await create("other"),
      delegate = await create("delegate"),
      admin = await create("admin", "admin"),
      committee = await create("committee", "committee"),
      pending = await create("pending", "pending");
    property = (
      await db.query(
        "select id from properties where slug='chalet-saint-mathieu'",
      )
    ).rows[0];
    assert.ok(property);
    const target = await fixture(member);
    for (const who of [other, delegate, committee]) {
      await api(who, "/reservations/" + target.id + "/cancel", "POST", {}, 403);
      await api(
        who,
        "/admin/reservations/" + target.id + "/cancel",
        "POST",
        {},
        403,
      );
      await api(who, "/cancellations", "GET", undefined, 403);
    }
    await api(null, "/reservations/" + target.id + "/cancel", "POST", {}, 401);
    await api(
      pending,
      "/reservations/" + target.id + "/cancel",
      "POST",
      {},
      403,
    );
    assert.equal((await api(member, "/me")).canBook, false);
    assert.ok(
      (await api(member, "/reservations")).some((s) => s.id === target.id),
    );
    await Promise.all(
      [1, 2].map(() =>
        api(member, "/reservations/" + target.id + "/cancel", "POST", {}),
      ),
    );
    const self = await evidence(target, member);
    assert.equal(self.audit.details.cancelledBy, "booker");
    assert.equal(self.message.recipient, member.email);
    assert.match(self.message.body, /à votre demande/);
    await fixture(other, "confirmed", target.start_date); // same dates are free again
    await api(other, "/reservations/" + target.id + "/cancel", "POST", {}, 403);
    for (const status of ["draft", "pending_payment", "pending_approval"]) {
      const own = await fixture(member, status);
      await api(member, "/reservations/" + own.id + "/cancel", "POST", {});
      await evidence(own, member, status !== "draft");
    }
    for (const status of ["rejected", "expired"]) {
      const own = await fixture(member, status);
      await api(member, "/reservations/" + own.id + "/cancel", "POST", {}, 409);
    }
    for (const who of [admin, other, delegate])
      await api(
        who,
        "/admin/accounts/" + delegate.id,
        "PATCH",
        patch(true),
        403,
      );
    await api(
      lead,
      "/admin/accounts/" + delegate.id,
      "PATCH",
      patch("true"),
      400,
    );
    await api(lead, "/admin/accounts/" + delegate.id, "PATCH", patch(true));
    assert.equal((await api(delegate, "/me")).canCancelOthers, true);
    const limited = await api(delegate, "/cancellations");
    assert.deepEqual(
      Object.keys(limited[0]).sort(),
      ["id", "startDate", "endDate", "guests", "status", "ownerName"].sort(),
    );
    for (const path of [
      "/admin/reservations",
      "/admin/accounts",
      "/admin/requests",
      "/reviews",
    ])
      await api(delegate, path, "GET", undefined, 403);
    await api(
      delegate,
      "/admin/reservations/" + target.id,
      "PATCH",
      { status: "cancelled" },
      403,
    );
    await api(
      delegate,
      "/reviews/" + target.id,
      "POST",
      { decision: "approve" },
      403,
    );
    const delegated = await fixture(member);
    const cancelled = await api(
      delegate,
      "/admin/reservations/" + delegated.id + "/cancel",
      "POST",
      {},
    );
    assert.deepEqual(
      Object.keys(cancelled).sort(),
      ["id", "startDate", "endDate", "guests", "status"].sort(),
    );
    assert.equal(
      (await evidence(delegated, delegate)).audit.details.cancelledBy,
      "delegate",
    );
    await api(lead, "/admin/accounts/" + delegate.id, "PATCH", patch(false));
    await api(
      delegate,
      "/admin/reservations/" + delegated.id + "/cancel",
      "POST",
      {},
      403,
    );
    await api(delegate, "/cancellations", "GET", undefined, 403);
    for (const who of [admin, lead]) {
      const stay = await fixture(member);
      await api(who, "/admin/reservations/" + stay.id + "/cancel", "POST", {});
      assert.equal(
        (await evidence(stay, who)).audit.details.cancelledBy,
        "administrator",
      );
    }
    const race = await fixture(member, "pending_approval");
    await Promise.all([
      api(member, "/reservations/" + race.id + "/cancel", "POST", {}),
      fetch(site + "/api/reviews/" + race.id, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + committee.token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ decision: "approve" }),
      }).then((r) => assert.ok([200, 409].includes(r.status))),
    ]);
    assert.equal(
      (await api(member, "/reservations/" + race.id)).status,
      "cancelled",
    );
    await evidence(race, member);
    await api(
      committee,
      "/reviews/" + race.id,
      "POST",
      { decision: "approve" },
      409,
    );
    await db.query("update users set is_disabled=true where id=$1", [other.id]);
    await api(other, "/reservations", "GET", undefined, 403);
    await api(other, "/reservations/" + target.id + "/cancel", "POST", {}, 403);
    const privileges = (
      await db.query(
        "select has_column_privilege('anon','public.users','can_cancel_others','UPDATE') as anon, has_column_privilege('authenticated','public.users','can_cancel_others','UPDATE') as authenticated",
      )
    ).rows[0];
    assert.deepEqual(privileges, { anon: false, authenticated: false });
    console.log("API permission, concurrency and email checks passed.");
    if (executablePath) await uiChecks(lead, member, delegate);
    console.log(
      "PASS: own cancellation without booking access; delegation default/grant/revoke; role boundaries; limited disclosure; active/terminal statuses; date release; concurrent cancellation and approval; audit/email deduplication; desktop/mobile confirmation and super-admin controls.",
    );
  } finally {
    await browser?.close();
    for (const table of ["booking_emails", "admin_actions"])
      await db.query(
        "delete from " + table + " where reservation_id=any($1::uuid[])",
        [stays],
      );
    await db.query("delete from reservations where id=any($1::uuid[])", [
      stays,
    ]);
    await db.query(
      "delete from public.users where auth_user_id=any($1::uuid[])",
      [accounts],
    );
    await db.query("delete from auth.users where id=any($1::uuid[])", [
      accounts,
    ]);
    await db.end();
  }
}
runTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
