import z from "zod";

export const listProductsSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20), // hard cap so nobody asks for 1,000,000 rows
    search: z.string().trim().min(1).max(100).optional(),
    category: z.string().trim().min(1).max(50).optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    inStock: z
      .enum(["true", "false"])
      .transform((v) => v === "true")
      .optional(),
    sortBy: z.enum(["createdAt", "price", "name"]).default("createdAt"), // whitelist: never sort by raw user input
    order: z.enum(["asc", "desc"]).default("desc"),
  })
  .refine(
    (d) =>
      d.minPrice === undefined ||
      d.maxPrice === undefined ||
      d.minPrice <= d.maxPrice,
    {
      message: "minPrice must be less than or equal to maxPrice",
      path: ["minPrice"],
    },
  );

export const productIdSchema = z.object({ id: z.uuid() });

export type ListProductsQuery = z.infer<typeof listProductsSchema>;

const productBase = z.object({
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, "SKU is required")
    .max(12, "SKU must be at most 12 characters")
    .regex(/^[A-Z0-9-]+$/, "Only letters, numbers and hyphens"),
  barcode: z
    .string()
    .trim()
    .max(64)
    .optional()
    .transform((v) => v || undefined),
  name: z
    .string()
    .trim()
    .min(1, "Product name is required")
    .max(120, "Product name is too long")
    .transform((s) => s.charAt(0).toUpperCase() + s.slice(1)),
  categoryId: z.uuid("Category is required"),
  supplierId: z.uuid("Supplier is required"),
  cost: z.coerce
    .number()
    .positive("Cost must be greater than 0")
    .max(99_999_999.99),
  price: z.coerce
    .number()
    .positive("Price must be greater than 0")
    .max(99_999_999.99),
  reorderLevel: z.coerce.number().int().nonnegative(), // no default here
});

const priceCheck = {
  path: ["price"],
  message: "Price is lower than cost",
};

export const createProductSchema = productBase
  .extend({ reorderLevel: productBase.shape.reorderLevel.default(0) })
  .refine((d) => d.price >= d.cost, priceCheck);

export const updateProductSchema = productBase
  .partial()
  .extend({
    // "" or null clears the barcode; omitting the field leaves it unchanged
    barcode: z
      .string()
      .trim()
      .max(64)
      .nullish()
      .transform((v) => (v === undefined ? undefined : v || null)),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: "Provide at least one field to update",
  })
  .refine(
    (d) => d.price === undefined || d.cost === undefined || d.price >= d.cost,
    priceCheck,
  );

export type CreateProduct = z.infer<typeof createProductSchema>;
export type UpdateProduct = z.infer<typeof updateProductSchema>;
