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
async function sign(label, invite = false) {
  const email = "chalet-qa-" + run + "-" + label + "@example.test";
  const result = invite
    ? await (async () => {
        const key = process.env.CHALET_TEST_AUTH_ADMIN_KEY;
        const response = await fetch(auth + "/invite", {
          method: "POST",
          headers: {
            apikey: key,
            Authorization: "Bearer " + key,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            data: { display_name: "Invitation QA" },
          }),
        });
        assert.ok(
          response.ok,
          "Local Auth invitation failed: " + response.status,
        );
        return response.json();
      })()
    : await check(
        auth + "/signup",
        200,
        "POST",
        {
          email,
          password,
          data: {
            display_name: "Essai " + label,
            declared_relation: label === "m" ? "proprietaire" : "location",
          },
        },
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
  const verified = await check(
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
  if (invite) return verified.access_token;
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
    const admin = await sign("a");
    await db.query(
      "update public.users set account_status='approved',is_disabled=false,booking_access='granted',is_admin=true,can_approve=true,\"group\"='proprietaire' where auth_user_id=$1",
      [created[0]],
    );
    const member = await sign("m");
    const self = await check(root + "/me", 200, "GET", null, member);
    assert.equal(self.name, "Essai m");
    assert.equal(self.isOwner, false);
    assert.equal(self.hasPassword, true);
    assert.equal(self.canBook, false);
    assert.equal(self.bookingAccess, "none");
    const adminProfile = await check(root + "/me", 200, "GET", null, admin);
    const loadRegistration = async (id) =>
      (await check(root + "/admin/accounts", 200, "GET", null, admin)).find(
        (a) => a.id === id,
      );
    const routeFor = (a) => root + "/admin/accounts/" + a.id + "/registration";
    const review = (a, decision, options = {}, status = 200, who = admin) =>
      check(
        routeFor(a),
        status,
        "POST",
        {
          decision,
          requestId: a.registrationRequestId,
          ...options,
        },
        who,
      );
    const regMail = async (to, subject, ...parts) => {
      const inbox = await check(mail + "/messages?limit=200");
      const letters = inbox.messages.filter(
        (x) =>
          x.To.some((t) => t.Address === to) && x.Subject.endsWith(subject),
      );
      const contents = await Promise.all(
        letters.map((x) => check(mail + "/message/" + x.ID)),
      );
      assert.equal(
        contents.filter((msg) =>
          parts.every(
            (t) =>
              msg.Text.includes(t) &&
              msg.HTML.includes(t.replaceAll("&", "&amp;")),
          ),
        ).length,
        1,
        subject,
      );
    };
    assert.equal(self.accountStatus, "pending");
    assert.equal(self.declaredRelation, "proprietaire");
    await check(root + "/me/booking-access", 403, "POST", {}, member);
    await check(
      root + "/me",
      403,
      "PATCH",
      { name: "Avant approbation" },
      member,
    );
    await check(root + "/account/articles", 403, "GET", null, member);
    await check(root + "/reservations", 403, "GET", null, member);
    const applicant = await loadRegistration(self.id);
    const basic = { group: "ami", canApprove: false, canBook: false };
    await regMail(
      adminProfile.email,
      "Nouvelle demande de création de compte",
      self.email,
      "Propriétaire",
      "/tableau-de-bord?onglet=comptes&demande=" +
        applicant.registrationRequestId,
    );
    await review(applicant, "approve", basic, 403, member);
    await check(
      root + "/admin/accounts/" + self.id,
      409,
      "PATCH",
      { ...basic, isDisabled: false },
      admin,
    );
    await review(applicant, "approve", { ...basic, canApprove: true }, 400);
    await review(applicant, "approve", basic);
    await review(applicant, "deny", {}, 409);
    await regMail(
      self.email,
      "Votre compte au chalet est approuvé",
      "Pour réserver, demandez l’autorisation",
    );
    assert.equal(
      (await check(root + "/me", 200, "GET", null, member)).accountStatus,
      "approved",
    );
    const refused = await sign("refus");
    const refusedSelf = await check(root + "/me", 200, "GET", null, refused);
    await review(await loadRegistration(refusedSelf.id), "deny");
    assert.equal(
      (await check(root + "/me", 200, "GET", null, refused)).accountStatus,
      "denied",
    );
    await check(root + "/account/articles", 403, "GET", null, refused);
    await check(root + "/me/booking-access", 403, "POST", {}, refused);
    await regMail(
      refusedSelf.email,
      "Votre demande de création de compte a été refusée",
      "/contact",
    );
    const renter = await sign("location");
    const renterSelf = await check(root + "/me", 200, "GET", null, renter);
    await review(await loadRegistration(renterSelf.id), "approve", {
      ...basic,
      group: "public",
      canBook: true,
    });
    const allowed = await check(root + "/me", 200, "GET", null, renter);
    assert.equal(allowed.canBook, true);
    assert.equal(allowed.isOwner, false);
    assert.equal(allowed.canApprove, false);
    await regMail(
      renterSelf.email,
      "Votre compte au chalet est approuvé",
      "/calendrier",
    );
    const updatePerms = (canBook) =>
      check(
        root + "/admin/accounts/" + renterSelf.id,
        200,
        "PATCH",
        { group: "public", canApprove: false, isDisabled: false, canBook },
        admin,
      );
    await updatePerms(false);
    await check(root + "/reservations", 403, "GET", null, renter);
    await updatePerms(true);
    await check(root + "/reservations", 200, "GET", null, renter);
    if (process.env.CHALET_TEST_AUTH_ADMIN_KEY) {
      const invited = await sign("invited", true);
      assert.equal(
        (await check(root + "/me", 200, "GET", null, invited)).hasPassword,
        false,
      );
      await check(auth + "/user", 200, "PUT", { password }, invited, true);
      assert.equal(
        (await check(root + "/me", 200, "GET", null, invited)).hasPassword,
        true,
      );
    }
    await check(root + "/admin/accounts", 403, "GET", null, member);
    await check(root + "/admin/accounts", 401);
    await check(root + "/reservations", 403, "GET", null, member);
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
    const access = root + "/me/booking-access",
      reviewAccess = root + "/admin/accounts/" + m.id + "/booking-access";
    let requestId;
    const decide = (decision, status = 200) =>
      check(reviewAccess, status, "POST", { decision, requestId }, admin);
    const adminEmail = adminProfile.email;
    const accessMail = async (recipient, subjectEnd, expected, href) => {
      const inbox = await check(mail + "/messages?limit=150");
      const rows = inbox.messages.filter(
        (r) =>
          r.Subject.endsWith(subjectEnd) &&
          r.To.some((t) => t.Address === recipient),
      );
      assert.equal(
        rows.length,
        expected,
        "one copy per recipient and event: " + subjectEnd,
      );
      const letters = await Promise.all(
        rows.map((r) => check(mail + "/message/" + r.ID)),
      );
      assert.ok(
        letters.some(
          (r) =>
            r.Text.includes(href) &&
            r.HTML.includes(href.replaceAll("&", "&amp;")) &&
            r.HTML.includes("Nom de plume"),
        ),
        "member name and correct link in both mail formats",
      );
    };
    await check(root + "/jobs/access-mail", 401);
    await check(access, 401, "POST", {});
    await check(access, 201, "POST", {}, member);
    await check(access, 200, "POST", {}, member);
    assert.equal(
      (
        await check(
          access.replace("/booking-access", ""),
          200,
          "GET",
          null,
          member,
        )
      ).canBook,
      false,
    );
    const queued = await check(
      root + "/admin/accounts",
      200,
      "GET",
      null,
      admin,
    );
    assert.equal(
      queued.filter((a) => a.id === m.id && a.bookingAccess === "pending")
        .length,
      1,
    );
    assert.ok(
      (
        await check(
          root + "/admin/booking-access/count",
          200,
          "GET",
          null,
          admin,
        )
      ).pending >= 1,
    );
    requestId = queued.find((a) => a.id === m.id).bookingAccessRequestId;
    const reviewLink = (id) =>
      new URL("/tableau-de-bord?onglet=comptes&demande=" + id, base).href;
    const notice = "Nouvelle demande d’accès aux réservations";
    await accessMail(adminEmail, notice, 1, reviewLink(requestId));
    await check(reviewLink(requestId)); // Mail previews never take a decision.
    await check(
      reviewAccess,
      403,
      "POST",
      { decision: "approve", requestId },
      member,
    );
    await check(reviewAccess, 401, "POST", { decision: "approve", requestId });
    await check(reviewAccess, 409, "POST", { decision: "approve" }, admin);
    await decide("deny");
    await decide("approve", 409);
    await accessMail(
      m.email,
      "Votre demande d’accès aux réservations est refusée",
      1,
      new URL("/tableau-de-bord?onglet=profil", base).href,
    );
    assert.equal(
      (await check(root + "/me", 200, "GET", null, member)).bookingAccess,
      "denied",
    );
    await check(access, 409, "POST", {}, member);
    await decide("reopen");
    await check(access, 201, "POST", {}, member);
    await decide("approve", 409); // The first email cannot approve the next request.
    const newId = (
      await check(root + "/admin/accounts", 200, "GET", null, admin)
    ).find((a) => a.id === m.id).bookingAccessRequestId;
    assert.notEqual(newId, requestId);
    requestId = newId;
    await accessMail(adminEmail, notice, 2, reviewLink(requestId));
    await decide("approve");
    await decide("approve", 409);
    await accessMail(
      m.email,
      "Votre accès aux réservations est accepté",
      1,
      new URL("/calendrier", base).href,
    );
    const granted = await check(root + "/me", 200, "GET", null, member);
    assert.equal(granted.canBook, true);
    assert.equal(granted.isOwner, false);
    assert.equal(granted.canApprove, false);
    await check(root + "/reviews", 403, "GET", null, member);
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
    assert.ok(
      (await check(cal, 200, "GET", null, member)).every(
        (x) => !("ownerName" in x),
      ),
    );
    assert.equal(
      (await check(root + "/reservations", 200, "GET", null, member)).some(
        (x) => x.id === stay,
      ),
      true,
    );
    await decide("revoke");
    await check(root + "/reservations", 403, "GET", null, member);
    await grant("proprietaire");
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
      "PASS: registration queue, claimed owner and actual permissions, approved with/without booking, rejected and replayed registration, later grants, both registration emails; admin review emails, member approval/refusal emails, guarded review links, stale and duplicate decisions, booking access requests, accept/refuse/revoke, password state, recovery and new-password sign-in, super-admin protection, signup and confirmation, password login, member permissions, profile byline, drafts/publication, promotion, approval, private names, booking edits, capacity, suspension, chalet settings.",
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
