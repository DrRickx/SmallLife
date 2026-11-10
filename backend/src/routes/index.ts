import { Router } from "express";
import AuthRoutes from "./auth.routes";
import ProductRoutes from "./product.routes";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.use("/auth", AuthRoutes);
router.use("/products", requireAuth, ProductRoutes);

export default router;
