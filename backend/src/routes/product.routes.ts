import { Router } from "express";
import { ProductController } from "../controllers/product.controller";
import {
  createProductSchema,
  updateProductSchema,
} from "../schema/product.schema";
import { validate } from "../middleware/validate";

const router = Router();

router.get("/", ProductController.list);
router.get("/:id", ProductController.getById);
router.post(
  "/",
  validate(createProductSchema as any),
  ProductController.create,
);
router.patch(
  "/:id",
  validate(updateProductSchema as any),
  ProductController.update,
);
router.delete("/:id", ProductController.delete);

export default router;
