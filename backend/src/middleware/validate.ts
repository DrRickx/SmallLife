import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";

export const validate =
  (schema: ZodType) => (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body); // ZodError is turned into a 400 by errorHandler
    next();
  };
