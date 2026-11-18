import { createHash } from "node:crypto";
import { Router, type IRouter } from "express";
import { chaletEmail } from "../../../../lib/shared/chalet-email.mjs";

const router: IRouter = Router();
const unavailable =
  "L’envoi est temporairement indisponible. Réessayez ou écrivez à reservations@chaletdelapointe.com.";
// Best-effort burst protection per server instance; the honeypot also catches bots.
const attempts = new Map<string, { count: number; expires: number }>();
const windowMs = 10 * 60 * 1000;

function resendKey() {
  if (process.env.RESEND_API_KEY) return process.env.RESEND_API_KEY;
  // The chalet already uses a Resend sending key for its reservation emails.
  try {
    const smtp = new URL(process.env.SMTP_URL || "");
    if (
      smtp.hostname === "smtp.resend.com" &&
      decodeURIComponent(smtp.username) === "resend"
    ) {
      return decodeURIComponent(smtp.password);
    }
  } catch {
    /* Missing or invalid SMTP configuration. */
  }
  return undefined;
}

router.post("/contact", async (req, res) => {
  res.set("Cache-Control", "no-store");
  if (!req.is("application/json")) {
    res.status(415).json({ error: "Format de message invalide." });
    return;
  }
  const origin = req.get("origin");
  if (origin) {
    try {
      const source = new URL(origin);
      if (
        source.host !== req.get("host") &&
        source.origin !==
          new URL(process.env.WEBSITE_URL || "https://www.chaletdelapointe.com")
            .origin
      ) {
        res
          .status(403)
          .json({ error: "Veuillez utiliser le formulaire du site." });
        return;
      }
    } catch {
      res.status(403).json({ error: "Origine du message invalide." });
      return;
    }
  }

  const body = req.body;
  const field = (key: string) =>
    typeof body?.[key] === "string" ? (body[key].trim() as string) : "";
  if (field("website")) {
    res.json({ success: true });
    return;
  }
  const name = field("name");
  const email = field("email");
  const dates = field("dates");
  const message = field("message");
  const requestId = field("requestId");
  if (
    !name ||
    name.length > 120 ||
    /[\r\n\x00]/.test(name) ||
    email.length > 254 ||
    !/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(email) ||
    dates.length > 200 ||
    /[\r\n\x00]/.test(dates) ||
    !message ||
    message.length > 5000 ||
    message.includes("\x00") ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      requestId,
    )
  ) {
    res
      .status(400)
      .json({
        error:
          "Vérifiez votre nom, votre courriel et votre message (5 000 caractères maximum).",
      });
    return;
  }

  const key = resendKey();
  const from = process.env.CONTACT_EMAIL_FROM || process.env.BOOKING_EMAIL_FROM;
  const to =
    process.env.CONTACT_EMAIL_TO || "reservations@chaletdelapointe.com";
  if (!key || !from) {
    res.status(503).json({ error: unavailable });
    return;
  }
  const now = Date.now();
  for (const [ip, entry] of attempts)
    if (entry.expires <= now) attempts.delete(ip);
  const ip =
    (process.env.VERCEL === "1"
      ? req.get("x-vercel-forwarded-for")
      : undefined) ||
    req.ip ||
    "unknown";
  const bucket = attempts.get(ip) || { count: 0, expires: now + windowMs };
  if (bucket.count >= 5 || (!attempts.has(ip) && attempts.size >= 10000)) {
    res.set("Retry-After", String(Math.ceil((bucket.expires - now) / 1000)));
    res
      .status(429)
      .json({
        error:
          "Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer.",
      });
    return;
  }
  bucket.count++;
  attempts.set(ip, bucket);

  const text = `Nom : ${name}\nCourriel : ${email}\nDates souhaitées : ${dates || "Non précisées"}\n\n${message}`;
  const payload = {
    from,
    to: [to],
    reply_to: email,
    subject: `Chalet de la Pointe · Message de ${name}`,
    text,
    html: chaletEmail({
      category: "Formulaire de contact",
      title: "Un nouveau message",
      message: text,
      button: "Répondre",
      href: `mailto:${email}`,
      view: "pointe",
      note: "Répondez à ce courriel pour joindre directement la personne qui vous a écrit.",
    }),
  };
  const fingerprint = createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `contact/${requestId}/${fingerprint}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    const result = (await response.json().catch(() => null)) as {
      id?: string;
    } | null;
    if (!response.ok || !result?.id) {
      req.log?.warn(
        { status: response.status },
        "Contact email rejected by Resend",
      );
      res.status(502).json({ error: unavailable });
      return;
    }
    req.log?.info({ emailId: result.id }, "Contact email accepted by Resend");
    res.json({ success: true });
  } catch {
    req.log?.warn("Contact email delivery could not be confirmed");
    res.status(502).json({ error: unavailable });
  }
});

export default router;
