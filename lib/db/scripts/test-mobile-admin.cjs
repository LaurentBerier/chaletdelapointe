// Destructive scenarios use generated fixtures on a disposable loopback stack only.
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { Client } = require("pg");
const {
  DATABASE_URL,
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  CHALET_TEST_SITE: site,
  CHALET_TEST_MAILPIT: mail,
  CHALET_TEST_AUTH_ADMIN_KEY: key,
  CHALET_TEST_CHROMIUM: executablePath,
} = process.env;
if (
  ![DATABASE_URL, SUPABASE_URL, site, mail].every(
    (u) => u && ["localhost", "127.0.0.1"].includes(new URL(u).hostname),
  ) ||
  !key ||
  !executablePath
)
  throw Error("Use local test services only.");
const db = new Client({ connectionString: DATABASE_URL }),
  accounts = [],
  stays = [],
  run = randomUUID().slice(0, 8),
  password = randomUUID() + "Qa1";
const phone = { width: 375, height: 812, isMobile: true, hasTouch: true },
  desktop = { width: 1280, height: 900 };
async function create(label, role) {
  const email = label + "." + run + "@example.test";
  const r = await fetch(SUPABASE_URL + "/auth/v1/admin/users", {
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
        declared_relation: "ami_famille",
      },
    }),
  });
  assert.ok(r.ok);
  const { id } = await r.json();
  accounts.push(id);
  if (role !== "pending")
    await db.query(
      `update public.users set account_status='approved',is_disabled=false,"group"=$2,can_approve=$3,is_admin=$4 where auth_user_id=$1`,
      [
        id,
        ["owner", "committee"].includes(role) ? "proprietaire" : "public",
        role === "committee",
        role === "super",
      ],
    );
  const {
    rows: [row],
  } = await db.query(
    "select id,registration_request_id from public.users where auth_user_id=$1",
    [id],
  );
  const t = await fetch(SUPABASE_URL + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  assert.ok(t.ok);
  return { ...row, email, token: (await t.json()).access_token };
}
async function api(who, path, method = "GET", body, status = 200) {
  const r = await fetch(site + "/api" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + who.token,
    },
    body: body && JSON.stringify(body),
  });
  assert.equal(r.status, status, method + " " + path);
  return r.json();
}
async function element(page, selector, text) {
  await page
    .waitForFunction(
      (sel, needle) =>
        [...document.querySelectorAll(sel)].some((e) =>
          e.textContent.includes(needle),
        ),
      {},
      selector,
      text,
    )
    .catch(async (e) => {
      throw Error(
        "Missing " +
          selector +
          " at " +
          page.url() +
          "; " +
          (
            await page.evaluate(
              () =>
                document.querySelector(".account-content")?.innerText ??
                document.body.innerText,
            )
          ).slice(0, 180),
        { cause: e },
      );
    });
  return page.evaluateHandle(
    (sel, needle) =>
      [...document.querySelectorAll(sel)].find((e) =>
        e.textContent.includes(needle),
      ),
    selector,
    text,
  );
}
async function press(card, label) {
  const btn = await card.evaluateHandle(
    (el, t) =>
      [...el.querySelectorAll("button")].find(
        (b) => b.textContent.trim() === t,
      ),
    label,
  );
  await btn.tap();
}
async function runTests() {
  await db.connect();
  let browser;
  try {
    const superUser = await create("direction", "super"),
      staff = await create("gestion", "member"),
      owner = await create("proprio", "owner"),
      committee = await create("comite", "committee"),
      pending = await create("invitation", "pending");
    const {
      rows: [prop],
    } = await db.query(
      "select id from properties where slug='chalet-saint-mathieu'",
    );
    for (const start of ["2037-05-07", "2037-05-15"]) {
      const {
        rows: [r],
      } = await db.query(
        `insert into reservations(property_id,user_id,start_date,end_date,guests,nights,subtotal,total,season_breakdown,status)
      values($1,$2,$3::date,$3::date+1,1,1,0,0,'[]','pending_approval') returning id`,
        [prop.id, owner.id, start],
      );
      stays.push(r.id);
    }
    browser = await require("puppeteer-core").launch({
      executablePath,
      headless: true,
      pipe: true,
    });
    async function login(who, tab = "profil") {
      const ctx = await browser.createBrowserContext(),
        page = await ctx.newPage();
      page.setDefaultTimeout(10000);
      await page.setViewport(phone);
      await page.goto(site + "/tableau-de-bord?onglet=" + tab);
      await page.waitForSelector("[data-testid=input-email]");
      await page.type("[data-testid=input-email]", who.email);
      await page.type("input[type=password]", password);
      await page.tap("[data-testid=button-submit]");
      await page.waitForSelector(".welcome-copy");
      assert.equal(new URL(page.url()).searchParams.get("onglet"), tab);
      return page;
    }
    async function menus(page, expected) {
      for (const size of [phone, desktop, phone]) {
        await page.setViewport(size);
        await page.waitForSelector(".account-nav");
        const ids = await page.$$eval(
          '.account-nav [data-group="staff"] a',
          (links) =>
            links
              .filter((e) => e.getBoundingClientRect().width > 0)
              .map((e) => e.getAttribute("data-testid").replace("tab-", "")),
        );
        assert.deepEqual(ids, expected);
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
      }
    }
    const lead = await login(superUser, "comptes");
    await menus(lead, [
      "approbations",
      "sejours",
      "comptes",
      "blogue",
      "chalet",
    ]);
    const profile = await element(lead, "details.panel", staff.email);
    await (await profile.$("summary")).tap();
    await (await profile.$("input[name=staff]")).tap();
    await press(profile, "Enregistrer ce compte");
    await lead.waitForFunction(() =>
      [...document.querySelectorAll("details[open] summary .badge")].some(
        (e) => e.textContent === "Administrateur",
      ),
    );
    assert.equal((await api(staff, "/me")).isReservationAdmin, true);
    const p = await login(staff);
    await menus(p, ["approbations", "sejours", "comptes", "blogue"]);
    await p.goto(site + "/calendrier");
    await p.waitForSelector('.calendar-page a[href$="onglet=approbations"]');
    await p.tap("[data-testid=button-mobile-menu]");
    await p.waitForSelector('.mobile-site-nav a[href$="onglet=approbations"]', {
      visible: true,
    });
    await p.tap('.mobile-site-nav a[href$="onglet=approbations"]');
    await p.waitForSelector(".mobile-site-nav", { hidden: true });
    async function review(day, action, next) {
      const row = await element(p, "li.stay-card", day + "–");
      await press(row, action);
      await p.waitForFunction(
        (d, s) =>
          [...document.querySelectorAll("li.stay-card")].some(
            (e) =>
              e.textContent.includes(d + "–") &&
              e.querySelector(".badge")?.textContent === s,
          ),
        {},
        day,
        next,
      );
    }
    await review("7", "Approuver", "Approuvée");
    await review("15", "Refuser", "Refusée");
    await p.tap("[data-testid=tab-sejours]");
    const booking = await element(p, "details.panel", "7–8 mai 2037");
    await (await booking.$("summary")).tap();
    const guests = await booking.$("input[name=guests]");
    await guests.focus();
    await p.keyboard.press("Backspace");
    await guests.type("2");
    await press(booking, "Modifier le séjour");
    await p.waitForFunction(() =>
      document
        .querySelector("details[open] summary")
        ?.textContent.includes("2 voyageurs"),
    );
    await press(booking, "Annuler la réservation…");
    await p.waitForSelector("[role=alertdialog]");
    await press(await p.$("[role=alertdialog]"), "Confirmer l’annulation");
    await p.waitForFunction(
      () =>
        document.querySelector("details[open] summary .badge")?.textContent ===
        "Annulée",
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from booking_emails where reservation_id=$1 and subject like '%annulée' and sent_at is not null",
          [stays[0]],
        )
      ).rows[0].n,
      1,
    );
    await api(staff, "/admin/accounts", "GET", null, 403);
    await api(staff, "/admin/properties/" + prop.id, "PATCH", {}, 403);
    await api(
      staff,
      "/admin/accounts/" + owner.id,
      "PATCH",
      {
        group: "proprietaire",
        isReservationAdmin: true,
        isDisabled: false,
        canApprove: false,
      },
      403,
    );
    await api(
      staff,
      "/admin/accounts/" + pending.id + "/registration",
      "POST",
      {
        requestId: pending.registration_request_id,
        decision: "approve",
        group: "proprietaire",
        canBook: true,
        canApprove: true,
      },
      403,
    );
    const nav = await p.$("[data-testid=tab-comptes]");
    await nav.evaluate((el) =>
      el.scrollIntoView({ block: "center", behavior: "instant" }),
    );
    await nav.tap();
    const request = await element(
      p,
      "article.access-queue-item",
      pending.email,
    );
    assert.equal(await request.$("select"), null);
    await press(request, "Approuver le compte");
    await p.waitForFunction(
      (e) => !document.querySelector(".access-queue")?.textContent.includes(e),
      {},
      pending.email,
    );
    assert.equal((await api(pending, "/me")).accountStatus, "approved");
    await api(pending, "/me/booking-access", "POST", {}, 201);
    await p.reload();
    const access = await element(p, "div.access-queue-item", pending.email);
    await press(access, "Autoriser à réserver");
    await p.waitForFunction(
      (e) =>
        ![...document.querySelectorAll("div.access-queue-item")].some((x) =>
          x.textContent.includes(e),
        ),
      {},
      pending.email,
    );
    assert.equal((await api(pending, "/me")).canBook, true);
    await api(
      staff,
      "/admin/accounts/" + pending.id + "/booking-access",
      "POST",
      { decision: "revoke" },
      403,
    );
    for (const [who, links] of [
      [owner, []],
      [committee, ["approbations"]],
    ]) {
      const v = await login(who);
      await menus(v, links);
      await api(who, "/admin/requests", "GET", null, 403);
      await api(who, "/admin/reservations", "GET", null, 403);
      await api(
        who,
        "/admin/reservations/" + stays[0] + "/cancel",
        "POST",
        {},
        403,
      );
      await api(who, "/reviews", "GET", null, who === committee ? 200 : 403);
      await v.close();
    }
    const form = {
      group: "public",
      canApprove: false,
      isDisabled: false,
      isReservationAdmin: false,
    };
    await api(superUser, "/admin/accounts/" + staff.id, "PATCH", form);
    await api(staff, "/admin/reservations", "GET", null, 403);
    await api(staff, "/admin/requests", "GET", null, 403);
    console.log(
      "PASS: desktop/mobile role menus, super-admin grant/revoke, mobile approve/reject/edit/cancel and email, membership/booking reviews, owner and committee limits.",
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
runTests().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
