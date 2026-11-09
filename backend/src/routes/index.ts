import { Router } from "express";
import AuthRoutes from "./auth.routes";

const router = Router();

router.use("/auth", AuthRoutes);

export default router;
