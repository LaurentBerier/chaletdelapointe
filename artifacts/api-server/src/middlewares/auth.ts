import { managesStays, reviewsStays } from "../../../../lib/shared/reservation-roles.js";
import { mayBook } from "../../../../lib/db/src/booking-access.js";
import type { RequestHandler } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, type User } from "../../../../lib/db/src/index.js";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      applicant?: User;
    }
  }
}

export const loadUser: RequestHandler = async (req, res, next) => {
  res.set("Cache-Control", "private, no-store");
  res.vary("Authorization");
  const header = req.get("Authorization");
  if (!header) return next();
  const url = process.env.SUPABASE_URL;
  const apikey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !apikey) {
    res.status(503).json({ error: "Connexion indisponible." });
    return;
  }
  if (!/^Bearer [^\s]+$/.test(header)) {
    res.status(401).json({ error: "Session invalide." });
    return;
  }
  const result = await fetch(new URL("/auth/v1/user", url), {
    headers: { Authorization: header, apikey },
    signal: AbortSignal.timeout(8000),
  });
  if (!result.ok) {
    res
      .status(result.status >= 500 ? 503 : 401)
      .json({ error: "Session non vérifiée." });
    return;
  }
  const identity = (await result.json()) as {
    id: string;
    email_confirmed_at?: string;
    is_anonymous?: boolean;
  };
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.authUserId, identity.id))
    .limit(1);
  if (
    !user ||
    !identity.email_confirmed_at ||
    identity.is_anonymous ||
    (user.accountStatus === "approved" && user.isDisabled)
  ) {
    res
      .status(403)
      .json({
        error: user?.isDisabled
          ? "Ce compte est suspendu."
          : "Confirmez votre adresse courriel pour accéder à votre compte.",
      });
    return;
  }
  // Unapproved identities can read only their own application status. All other
  // endpoints see the same permissions as a visitor until an administrator acts.
  if (user.accountStatus !== "approved") req.applicant = user;
  else req.user = user;
  next();
};

export const requireAccount: RequestHandler = (req, res, next) => {
  if (!req.user) {
    res
      .status(req.applicant ? 403 : 401)
      .json({
        error: req.applicant
          ? "Un compte approuvé est requis."
          : "Connexion requise.",
      });
    return;
  }
  next();
};

export const requireBookingAccess: RequestHandler = (req, res, next) => {
  if (!req.user || !mayBook(req.user)) {
    res
      .status(req.user || req.applicant ? 403 : 401)
      .json({ error: "Accès aux réservations requis." });
    return;
  }
  next();
};

export const requireAdmin: RequestHandler = (req, res, next) => {
  if (!req.user?.isAdmin) {
    res
      .status(req.user || req.applicant ? 403 : 401)
      .json({ error: "Accès administrateur requis." });
    return;
  }
  next();
};

export const requireStaff: RequestHandler = (req, res, next) => {
  if (!managesStays(req.user)) {
    res.status(req.user || req.applicant ? 403 : 401).json({ error: "Accès réservé aux administrateurs." });
    return;
  }
  next();
};

export const requireApprover: RequestHandler = (req, res, next) => {
  if (!reviewsStays(req.user)) {
    res
      .status(req.user || req.applicant ? 403 : 401)
      .json({ error: "Accès au comité requis." });
    return;
  }
  next();
};
