import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  lte,
  or,
  type SQL,
} from "drizzle-orm";
import type {
  CreateProduct,
  ListProductsQuery,
  UpdateProduct,
} from "../schema/product.schema";
import { db } from "../config/db";
import { categories, products, suppliers } from "../db/schema/schema";
import AppError, {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../utils/AppError";
import { dnsPrefetchControl } from "helmet";

// column whitelist matching the Zod enum
const SORT_COLUMNS = {
  createdAt: products.createdAt,
  price: products.price,
  name: products.name,
} as const;

// stop users' "%" and "_" from acting as wildcards in LIKE
const escapeLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");

export class ProductService {
  static async list(q: ListProductsQuery) {
    const filters: SQL[] = [eq(products.isActive, 1)];

    if (q.search) {
      const term = `%${escapeLike(q.search)}%`;
      filters.push(or(ilike(products.name, term), ilike(products.sku, term))!);
    }
    if (q.category) filters.push(eq(products.categoryId, q.category));
    if (q.minPrice !== undefined)
      filters.push(gte(products.price, String(q.minPrice)));
    if (q.maxPrice !== undefined)
      filters.push(lte(products.price, String(q.maxPrice)));
    if (q.inStock) filters.push(gt(products.quantityOnHand, 0));

    const where = and(...filters);
    const sortColumn = SORT_COLUMNS[q.sortBy];
    // second sort key makes the order deterministic, so rows never repeat or skip between pages
    const orderBy = [
      q.order === "asc" ? asc(sortColumn) : desc(sortColumn),
      asc(products.id),
    ];
    const offset = (q.page - 1) * q.limit;

    const [items, countResult] = await Promise.all([
      db
        .select()
        .from(products)
        .where(where)
        .orderBy(...orderBy)
        .limit(q.limit)
        .offset(offset),
      db.select({ total: count() }).from(products).where(where),
    ]);

    const countRow = countResult[0];
    if (!countRow) throw new Error("Product count query returned no result");
    const { total } = countRow;

    const totalPages = Math.max(1, Math.ceil(total / q.limit));
    return {
      items,
      meta: {
        page: q.page,
        limit: q.limit,
        total,
        totalPages,
        hasNext: q.page < totalPages,
        hasPrev: q.page > 1,
      },
    };
  }

  static async getById(id: string) {
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.isActive, 1)));
    if (!product) throw new NotFoundError("Product not found");
    return product;
  }

  static async create(data: CreateProduct) {
    const [[category], [supplier]] = await Promise.all([
      db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.id, data.categoryId)),
      db
        .select({ id: suppliers.id })
        .from(suppliers)
        .where(eq(suppliers.id, data.supplierId)),
    ]);

    if (!category) throw new NotFoundError("Category not found");
    if (!supplier) throw new NotFoundError("Supplier not found");

    const [exists] = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.sku, data.sku),
          eq(products.name, data.name),
          eq(products.supplierId, data.supplierId),
        ),
      );
    if (exists) {
      throw new ConflictError("Product already exists");
    }

    const [product] = await db
      .insert(products)
      .values({ ...data, cost: String(data.cost), price: String(data.price) })
      .returning();
    if (!product) {
      throw new AppError("Failed to create product", 400);
    }
    return product;
  }

  static async update(id: string, data: UpdateProduct) {
    // Check if the product doest exist
    const [exists] = await db
      .select()
      .from(products)
      .where(eq(products.id, id));
    if (!exists) {
      throw new NotFoundError("Product does not exists or already phased out");
    }

    const price = data.price ?? Number(exists.price);
    const cost = data.cost ?? Number(exists.cost);
    if (price < cost) {
      throw new ValidationError("Price is lower than cost");
    }

    const { cost: newCost, price: newPrice, ...productData } = data;

    const [updated] = await db
      .update(products)
      .set({
        ...productData,
        ...(newCost !== undefined ? { cost: String(newCost) } : {}),
        ...(newPrice !== undefined ? { price: String(newPrice) } : {}),
      })
      .where(eq(products.id, id))
      .returning();
    if (!updated) {
      throw new AppError("Failed to update product", 400);
    }
    return updated;
  }

  static async delete(id: string) {
    const [exists] = await db
      .select()
      .from(products)
      .where(eq(products.id, id));
    if (!exists) {
      throw new NotFoundError("Product does not exists or already phased out");
    }
    const [product] = await db.delete(products).where(eq(products.id, id));
    return product!;
  }
}
