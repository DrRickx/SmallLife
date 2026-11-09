import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./src/config/env";
import { errorHandler } from "./src/middleware/errorHandler.middleware";
import routes from "./src/routes/index";

const app = express();

app.set("trust proxy", 1); // behind Render/Railway/Vercel proxy; makes req.ip and rate limits correct
app.use(helmet());
app.use(cors({ origin: env.ALLOWED_ORIGINS, credentials: true }));
app.use(express.json());
app.use(cookieParser());

if (env.NODE_ENV === "development") app.use(morgan("dev"));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api", routes);

app.use(errorHandler);

export default app;
