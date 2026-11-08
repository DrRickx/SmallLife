import { roleEnum } from "../db/schema/schema";

export interface AuthUser {
  id: string;
  role: roleEnum;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
