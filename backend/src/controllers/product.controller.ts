import type { Request, Response } from "express";
import catchAsync from "../utils/CatchAsync";
import {
  createProductSchema,
  listProductsSchema,
  productIdSchema,
  updateProductSchema,
} from "../schema/product.schema";
import { ProductService } from "../services/product.services";

export class ProductController {
  static list = catchAsync(async (req, res) => {
    const query = listProductsSchema.parse(req.query);
    const result = await ProductService.list(query);
    res.json(result);
  });

  static getById = catchAsync(async (req: Request, res: Response) => {
    const { id } = productIdSchema.parse(req.params);
    res.json({ product: await ProductService.getById(id) });
  });

  static create = catchAsync(async (req: Request, res: Response) => {
    const data = createProductSchema.parse(req.body);
    const product = await ProductService.create(data);
    res.status(201).json({ product });
  });

  static update = catchAsync(async (req: Request, res: Response) => {
    const { id } = productIdSchema.parse(req.params);
    const data = updateProductSchema.parse(req.body);

    const result = await ProductService.update(id, data);
    res.status(200).json({ result });
  });

  static delete = catchAsync(async (req: Request, res: Response) => {
    const { id } = productIdSchema.parse(req.params);
    await ProductService.delete(id);
    res.status(200).json({ message: "Successfully deleted product" });
  });
}
