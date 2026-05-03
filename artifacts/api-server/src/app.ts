import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import pinoHttpModule, {
  type HttpLogger,
  type Options as PinoHttpOptions,
  type ReqId,
} from "pino-http";
import type { IncomingMessage, ServerResponse } from "node:http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

const app: Express = express();
const pinoHttp = pinoHttpModule as unknown as (
  opts?: PinoHttpOptions<IncomingMessage, ServerResponse>,
) => HttpLogger<IncomingMessage, ServerResponse>;

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: IncomingMessage & { id?: ReqId }) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: ServerResponse) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.get("/", (_req: Request, res: Response) => {
  res.type("text/html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Chalet de la Pointe API</title>
  </head>
  <body>
    <main>
      <h1>Chalet de la Pointe API</h1>
      <p>Service is running.</p>
      <p><a href="/api/healthz">Health check</a></p>
    </main>
  </body>
</html>`);
});

app.get("/favicon.ico", (_req: Request, res: Response) => {
  res.status(204).end();
});

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  logger.error(
    {
      err,
      method: req.method,
      path: req.path,
    },
    "Unhandled request error",
  );

  if (!res.headersSent) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default app;
