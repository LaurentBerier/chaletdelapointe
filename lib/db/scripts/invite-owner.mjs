// Run from lib/db with the intended project's server environment loaded.
// Register only the supplied address. Re-running links an existing Auth user.
import pg from "pg";
const [emailInput, name, flag] = process.argv.slice(2);
if (!emailInput || !name || (flag && flag !== "--approver")) {
  throw new Error("Usage: node scripts/invite-owner.mjs EMAIL NAME [--approver]");
}
const email = emailInput.trim().toLowerCase();
const { DATABASE_URL, SUPABASE_URL, SUPABASE_SECRET_KEY, WEBSITE_URL } = process.env;
if (!DATABASE_URL || !SUPABASE_URL || !SUPABASE_SECRET_KEY || !WEBSITE_URL) {
  throw new Error("Set DATABASE_URL, SUPABASE_URL, SUPABASE_SECRET_KEY and WEBSITE_URL for the chalet project.");
}
const ca = process.env.DATABASE_CA_CERT;
const pool = new pg.Pool({ connectionString: DATABASE_URL, ...(ca ? { ssl: { ca, rejectUnauthorized: true } } : {}) });
try {
  const find = async () => (await pool.query("select id from auth.users where lower(email) = $1", [email])).rows[0];
  let identity = await find();
  if (!identity) {
    const url = new URL("/auth/v1/invite", SUPABASE_URL);
    url.searchParams.set("redirect_to", new URL("/connexion", WEBSITE_URL).href);
    const res = await fetch(url, { method: "POST", headers: {
      apikey: SUPABASE_SECRET_KEY, Authorization: "Bearer " + SUPABASE_SECRET_KEY, "Content-Type": "application/json",
    }, body: JSON.stringify({ email }) });
    if (!res.ok) throw new Error("Supabase invitation failed (HTTP " + res.status + ").");
    const invited = await res.json();
    identity = await find();
    if (identity?.id !== invited.id) throw new Error("Check that the database and Supabase Auth belong to the same project.");
  }
  const result = await pool.query(`
    insert into public.users(email, name, "group", can_approve, auth_user_id, account_status,booking_access,is_disabled)
    values ($1,$2,'proprietaire',$3,$4,'approved','granted',false)
    on conflict (email) do update set name = excluded.name, "group" = excluded."group",
      can_approve = excluded.can_approve, auth_user_id = excluded.auth_user_id,
      account_status = 'approved', booking_access = 'granted', is_disabled = case when users.account_status='approved' then users.is_disabled else false end
    where not users.is_admin and (users.auth_user_id is null or users.auth_user_id = excluded.auth_user_id)
    returning id
  `, [email, name, flag === "--approver", identity.id]);
  if (!result.rowCount) throw new Error("This account is protected or already linked to another identity.");
  console.log("Owner linked:", email, flag === "--approver" ? "(approver)" : "");
} finally { await pool.end(); }
