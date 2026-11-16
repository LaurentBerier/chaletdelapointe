// Run against a disposable local chalet stack; see supabase/README.md.
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { Client } = require("pg");
const { CHALET_TEST_SITE: site, SUPABASE_URL: auth, DATABASE_URL: dbUrl,
  CHALET_TEST_AUTH_ADMIN_KEY: key, CHALET_TEST_CHROMIUM: executablePath } = process.env;
if (![site, auth, dbUrl].every(u => u && ["localhost", "127.0.0.1"].includes(new URL(u).hostname)) || !key || !executablePath) {
  throw Error("Use a disposable loopback site, Auth, database and Chromium.");
}
const puppeteer = require("puppeteer-core");
const db = new Client({ connectionString: dbUrl });
const accounts = [], stays = [], password = randomUUID() + "Qa";
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto" }).format(new Date());
const [year, month] = today.split("-").map(Number);
// Fixture month starts next month; day zero is its previous month's last day.
const date = (day, shift = 0) => new Date(Date.UTC(year, month + shift, day)).toISOString().slice(0, 10);
const button = day => 'td[data-day="' + day + '"]:not([data-outside]) button';

async function account(name, owner) {
  const email = "qa-" + randomUUID() + "@example.test";
  const response = await fetch(auth + "/auth/v1/admin/users", { method: "POST",
    headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { display_name: name, declared_relation: "ami_famille" } }),
  });
  assert.ok(response.ok, "Create temporary Auth identity");
  const { id } = await response.json(); accounts.push(id);
  const { rows: [profile] } = await db.query(`update public.users set name=$1, "group"=$2,
    is_disabled=false, booking_access='granted', account_status='approved' where auth_user_id=$3 returning id`,
    [name, owner ? "proprietaire" : "public", id]);
  return { ...profile, email, name };
}
async function login(page, who) {
  await page.goto(site + "/connexion");
  await page.waitForSelector("[data-testid=input-email]");
  await page.type("[data-testid=input-email]", who.email);
  await page.type("input[type=password]", password);
  await page.click("[data-testid=button-submit]");
  await page.waitForFunction(() => location.pathname === "/tableau-de-bord");
}
async function run() {
  await db.connect();
  let browser;
  try {
    const a = await account("Camille du Lac", true), b = await account("Dominique de la Pointe", true),
      member = await account("Membre du chalet", false);
    const { rows: [property] } = await db.query("select id from properties where slug='chalet-saint-mathieu'");
    for (const [who, start, end, status] of [
      [a, date(18), date(21), "pending_approval"], [b, date(22), date(26), "confirmed"],
      [a, date(26), date(1, 1), "pending_approval"],
    ]) {
      const { rows: [row] } = await db.query(`insert into reservations(property_id,user_id,start_date,end_date,guests,nights,subtotal,total,season_breakdown,status)
        values($1,$2,$3::date,$4::date,1,$4::date-$3::date,0,0,'[]',$5) returning id`, [property.id, who.id, start, end, status]);
      stays.push(row.id);
    }
    browser = await puppeteer.launch({ executablePath, headless: true, pipe: true });
    async function open(viewport, who) {
      const context = await browser.createBrowserContext(), page = await context.newPage();
      await page.setViewport(viewport);
      page.setDefaultTimeout(10000);
      if (who) await login(page, who);
      await page.goto(site + "/calendrier");
      await page.waitForSelector(".rdp-button_next");
      if (viewport.width < 768) await page.click(".rdp-button_next");
      await page.waitForSelector(button(date(18)));
      return page;
    }
    const desktop = { width: 1280, height: 950 };
    for (const viewer of [null, member]) {
      const page = await open(desktop, viewer);
      assert.equal(await page.$(".calendar-stay-day"), null);
      for (const n of [18, 19, 20]) assert.ok(await page.$eval(button(date(n)), e => e.disabled));
      assert.match(await page.$eval(button(date(21)), e => e.textContent), /Départ/);
      assert.equal(await page.$eval(button(date(21)), e => e.disabled), false);
      const markup = await page.$eval(".calendar-page", e => e.outerHTML);
      for (const { name } of [a, b]) assert.ok(!markup.includes(name));
      await page.click(button(date(21))); await page.click(button(date(22)));
      assert.match(await page.$eval("aside", e => e.textContent), /1 nuit/);
      await page.close();
    }
    const page = await open(desktop, b);
    const tip = ".calendar-stay-tip", text = async () => { await page.waitForSelector(tip); return page.$eval(tip, e => e.textContent); };
    const label = n => page.$eval(button(date(n)), e => e.getAttribute("aria-label"));
    for (const n of [18, 19, 20]) assert.match(await label(n), /Demande en attente : Camille du Lac/);
    await page.hover(button(date(19))); assert.match(await text(), /Demande en attenteCamille du Lac/);
    await page.click(button(date(19))); await page.mouse.move(2, 2); assert.match(await text(), /Camille du Lac/);
    assert.deepEqual(await page.$$eval("aside dd", els => els.map(e => e.textContent)), ["À choisir", "À choisir"]);
    await page.keyboard.press("Escape"); await page.waitForSelector(tip, { hidden: true });
    await page.click(button(date(21))); assert.match(await text(), /Départ · Demande en attenteCamille du Lac.*Nuit disponible/);
    await page.click(button(date(22)));
    assert.match(await page.$eval("aside", e => e.textContent), /1 nuit/);
    assert.deepEqual(await page.$$eval("aside dd", els => els.map(e => e.textContent.split(" ")[0])), ["21", "22"]);
    assert.match(await label(26), /Départ.*Séjour confirmé : Dominique de la Pointe.*Arrivée.*Demande en attente : Camille du Lac/);
    assert.ok(await page.$$eval(".calendar-stay-row", els => els.some(e => /Camille du Lac.*En attente/.test(e.textContent))));
    await page.close();

    const phone = await open({ width: 375, height: 820, isMobile: true, hasTouch: true }, b);
    await phone.tap(button(date(26))); await phone.waitForSelector(tip);
    assert.deepEqual(await phone.$$eval(tip + " strong", els => els.map(e => e.textContent)), [b.name, a.name]);
    const box = await phone.$eval(tip, e => { const r = e.getBoundingClientRect(); return [r.left, r.right, innerWidth]; });
    assert.ok(box[0] >= 0 && box[1] <= box[2]);
    await phone.tap("h1"); await phone.waitForSelector(tip, { hidden: true });
    await phone.tap(".rdp-button_next"); await phone.waitForSelector(button(date(1, 1)));
    assert.match(await phone.$eval(button(date(1, 1)), e => e.textContent), /Départ/);
    await phone.tap(button(date(1, 1))); await phone.waitForSelector(tip);
    assert.match(await phone.$eval(tip, e => e.textContent), /Camille du Lac.*Nuit disponible/);
    assert.match(await phone.$eval("aside dd", e => e.textContent), /^1 /);
    console.log("PASS: visitor and booking-member privacy, owner pending/confirmed names, occupied nights, checkout and one-night rebooking, two-party turnover, month boundary, hover, keyboard dismissal and phone taps.");
  } finally {
    await browser?.close();
    await db.query("delete from reservations where id=any($1::uuid[])", [stays]);
    await db.query("delete from public.users where auth_user_id=any($1::uuid[])", [accounts]);
    await db.query("delete from auth.users where id=any($1::uuid[])", [accounts]);
    await db.end();
  }
}
run().catch(e => { console.error(e); process.exitCode = 1; });
