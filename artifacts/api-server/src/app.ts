import express, { type Express } from "express";
import cors from "cors";
import pinoHttpModule, {
  type HttpLogger,
  type Options as PinoHttpOptions,
  type ReqId,
} from "pino-http";
import type { IncomingMessage, ServerResponse } from "node:http";
import router from "./routes";
import { logger } from "./lib/logger";

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

export default app;
