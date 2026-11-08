import type { Request, Response, NextFunction, RequestHandler } from "express";
import { db } from "../config/db";

type TxHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

export default function withTransaction(fn: TxHandler): RequestHandler {
  return async (req, res, next) => {
    try {
      await db.transaction(async (tx) => {
        (req as Request & { tx: typeof tx }).tx = tx;
        return fn(req, res, next);
      });
    } catch (err) {
      next(err);
    }
  };
}
