import type { RequestHandler } from "express";
import { isDatabaseConfigured } from "@workspace/db";

export const requireDatabase: RequestHandler = (_req, res, next) => {
  if (isDatabaseConfigured) {
    next();
    return;
  }

  res.status(503).json({
    error: "Service unavailable: DATABASE_URL is not configured.",
  });
};
