import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import express from "express";

const temp = await mkdtemp(path.join(tmpdir(), "chalet-contact-"));
const entry = new URL("../src/routes/contact.ts", import.meta.url).pathname;
const outfile = path.join(temp, "contact.mjs");
await build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  banner: {
    js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
  },
});
const { default: contact } = await import(pathToFileURL(outfile).href);
const app = express().use(express.json()).use("/api", contact);
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
const url = `http://127.0.0.1:${server.address().port}/api/contact`;
const realFetch = globalThis.fetch;
const originalEnv = { ...process.env };
process.env.VERCEL = "1";
process.env.RESEND_API_KEY = "re_test";
process.env.BOOKING_EMAIL_FROM = "Chalet <reservations@chaletdelapointe.com>";
process.env.CONTACT_EMAIL_TO = "reservations@chaletdelapointe.com";
let upstream = () => Response.json({ id: "test-email-id" });
const sends = [];
globalThis.fetch = async (input, init) => {
  if (input === "https://api.resend.com/emails") {
    sends.push({
      headers: init.headers,
      body: JSON.parse(init.body),
      signal: init.signal,
    });
    return upstream();
  }
  return realFetch(input, init);
};
const valid = {
  name: "  Jeanne <Test>  ",
  email: "jeanne@example.com",
  dates: "12 au 18 décembre",
  message: "Bonjour <script>alert(1)</script>\nUne question.",
  requestId: randomUUID(),
};
let ipNumber = 0;
async function post(body = valid, headers = {}) {
  return realFetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-vercel-forwarded-for": `192.0.2.${++ipNumber}`,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}
try {
  for (const change of [
    { name: " " },
    { name: "A\r\nB" },
    { email: "bad" },
    { email: "x@y.ca\r\nBcc:spam@example.com" },
    { message: " " },
    { message: "x".repeat(5001) },
    { dates: "x".repeat(201) },
    { requestId: "bad" },
  ]) {
    assert.equal((await post({ ...valid, ...change })).status, 400);
  }
  assert.equal(sends.length, 0, "invalid input never sends mail");
  assert.equal(
    (await post(valid, { Origin: "https://untrusted.example" })).status,
    403,
  );
  assert.equal(
    (await post(valid, { "Content-Type": "text/plain" })).status,
    415,
  );
  assert.equal((await post({ website: "spam.example" })).status, 200);
  assert.equal(sends.length, 0, "honeypot never sends mail");
  const response = await post(
    { ...valid, to: "attacker@example.com" },
    { Origin: "https://www.chaletdelapointe.com" },
  );
  assert.deepEqual(await response.json(), { success: true });
  const sent = sends.at(-1);
  assert.deepEqual(sent.body.to, ["reservations@chaletdelapointe.com"]);
  assert.equal(sent.body.reply_to, valid.email);
  assert.match(sent.body.text, /12 au 18 décembre/);
  assert.match(sent.body.html, /&lt;script&gt;/);
  assert.ok(!sent.body.html.includes("<script>"));
  assert.equal(sent.headers.Authorization, "Bearer re_test");
  assert.ok(sent.signal instanceof AbortSignal);
  await post(valid);
  assert.equal(
    sends.at(-1).headers["Idempotency-Key"],
    sent.headers["Idempotency-Key"],
  );
  await post({ ...valid, message: "Message modifié" });
  assert.notEqual(
    sends.at(-1).headers["Idempotency-Key"],
    sent.headers["Idempotency-Key"],
  );
  await post({ ...valid, dates: undefined });
  assert.match(sends.at(-1).body.text, /Non précisées/);

  delete process.env.RESEND_API_KEY;
  process.env.SMTP_URL = "smtps://resend:re_smtp@smtp.resend.com:465";
  assert.equal((await post()).status, 200);
  assert.equal(sends.at(-1).headers.Authorization, "Bearer re_smtp");
  process.env.SMTP_URL = "smtps://user:secret@unrelated.example";
  const count = sends.length;
  assert.equal((await post()).status, 503);
  assert.equal(sends.length, count);
  process.env.RESEND_API_KEY = "re_test";
  for (const failure of [
    () =>
      Response.json({ message: "private provider failure" }, { status: 403 }),
    () => Response.json({}),
    () => {
      throw new DOMException("timeout", "TimeoutError");
    },
  ]) {
    upstream = failure;
    const failed = await post();
    assert.equal(failed.status, 502);
    const result = await failed.json();
    assert.ok(result.error && !result.success);
    assert.ok(!result.error.includes("private provider failure"));
  }
  upstream = () => Response.json({ id: "test-email-id" });
  for (let i = 0; i < 5; i++)
    assert.equal(
      (await post(valid, { "x-vercel-forwarded-for": "192.0.2.250" })).status,
      200,
    );
  const limited = await post(valid, {
    "x-vercel-forwarded-for": "192.0.2.250",
  });
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get("Retry-After")) > 0);
  console.log(
    "PASS: validation, origin, honeypot, fixed recipient, Reply-To, escaping, idempotency, Resend SMTP credential reuse, provider errors, timeout and burst limit.",
  );
} finally {
  globalThis.fetch = realFetch;
  for (const key of Object.keys(process.env))
    if (!(key in originalEnv)) delete process.env[key];
  Object.assign(process.env, originalEnv);
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await rm(temp, { recursive: true, force: true });
}
