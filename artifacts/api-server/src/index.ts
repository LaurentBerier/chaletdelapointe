import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import app from "./app.js";
import { logger } from "./lib/logger.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const site = express();
const publicDir = fileURLToPath(new URL("../public/", import.meta.url));
site.use((req, res, next) => {
  if (req.path === "/api" || req.path.startsWith("/api/")) app(req, res, next);
  else next();
});
site.use(express.static(publicDir));
site.get("/{*path}", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));

site.listen(port, process.env.LISTEN_HOST || "0.0.0.0", (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
