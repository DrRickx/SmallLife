import { sql } from "drizzle-orm";
import { smallint, uniqueIndex } from "drizzle-orm/cockroach-core";
import {
  check,
  decimal,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";

export const roleEnum = pgEnum("role", ["owner", "sales"]);
export const stockMovementTypeEnum = pgEnum("stock_movement_type", [
  "purchase_in",
  "sale_out",
  "adjustment",
]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "credit_card",
  "bank_transfer",
  "mobile_payment",
]);
export const purchaseOrderStatusEnum = pgEnum("purchase_order_status", [
  "draft",
  "ordered",
  "received",
  "cancelled",
]);

export const users = pgTable.withRLS("users", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  role: roleEnum().default("sales").notNull(),
  tokenVersion: integer("token_version").notNull().default(0), // bump = kill all access tokens
  failedLogins: integer("failed_logins").notNull().default(0),
  lockedUntil: timestamp("locked_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Role = User["role"];

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  familyId: uuid("family_id").notNull(), // one login = one family; used for reuse detection
  refreshHash: text("refresh_hash").notNull().unique(), // SHA-256 of the token, never the token
  userAgent: text("user_agent"),
  ip: text("ip"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
});

export const passwordResets = pgTable("password_resets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
});

export const categories = pgTable.withRLS("categories", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  name: varchar("name", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export const products = pgTable.withRLS("products", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  sku: varchar("sku", { length: 12 }).notNull().unique(),
  barcode: varchar("barcode", { length: 13 }).unique(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  supplierId: uuid("supplier_id").references(() => suppliers.id, {
    onDelete: "cascade",
  }),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  quantityOnHand: integer("quantity_on_hand").default(0).notNull(),
  reorderLevel: integer("reorder_level").default(0).notNull(),
  isActive: integer("is_active").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export const stockMovements = pgTable.withRLS(
  "stock_movements",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    productId: uuid("product_id")
      .references(() => products.id, { onDelete: "cascade" })
      .notNull(),
    type: stockMovementTypeEnum().notNull().default("sale_out"),
    quantity: integer("quantity").notNull(),
    reason: text("reason"),
    referenceId: uuid("reference_id").references(() => sales.id, {
      onDelete: "cascade",
    }),
    unitCost: decimal("unit_cost", { precision: 10, scale: 2 }),
    userId: uuid("user_id")
      .$defaultFn(() => uuidv7())
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("stock_movements_product_id_index").on(t.productId),
    index("stock_movements_reference_id_index").on(t.referenceId),
    index("stock_movements_user_id_index").on(t.userId),
    check("quantity_positive_check", sql`${t.quantity} > 0`),
  ],
);

export type StockMovement = typeof stockMovements.$inferSelect;
export type NewStockMovement = typeof stockMovements.$inferInsert;

export const sales = pgTable.withRLS(
  "sales",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid("user_id")
      .$defaultFn(() => uuidv7())
      .references(() => users.id, { onDelete: "cascade" }),
    receiptNo: varchar("receipt_no", { length: 20 }).notNull().unique(),
    paymentMethod: paymentMethodEnum().notNull().default("cash"),
    subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
    tax: decimal("tax", { precision: 10, scale: 2 }).notNull(),
    total: decimal("total", { precision: 10, scale: 2 }).notNull(),
    amountTendered: decimal("amount_tendered", {
      precision: 10,
      scale: 2,
    }).notNull(),
    changeDue: decimal("change_due", { precision: 10, scale: 2 }).notNull(),
    status: smallint("status").default(1).notNull(), // 1 = completed, 0 = pending, -1 = cancelled
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("sales_user_id_index").on(t.userId),
    index("sales_receipt_no_index").on(t.receiptNo),
    index("sales_payment_method_index").on(t.paymentMethod),
    index("sales_status_index").on(t.status),
    check("amount_tendered_check", sql`${t.amountTendered} >= ${t.total}`),
    check(
      "change_due_check",
      sql`${t.changeDue} = ${t.amountTendered} - ${t.total}`,
    ),
    check("status_check", sql`${t.status} IN (-1, 0, 1)`),
  ],
);

export type Sale = typeof sales.$inferSelect;
export type NewSale = typeof sales.$inferInsert;

export const saleItems = pgTable.withRLS(
  "sale_items",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    saleId: uuid("sale_id")
      .references(() => sales.id, { onDelete: "cascade" })
      .notNull(),
    productId: uuid("product_id")
      .references(() => products.id, { onDelete: "cascade" })
      .notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
    unitCost: decimal("unit_cost", { precision: 10, scale: 2 }).notNull(),
    lineTotal: decimal("line_total", { precision: 10, scale: 2 }).notNull(),
  },
  (t) => [
    index("sale_items_sale_id_index").on(t.saleId),
    index("sale_items_product_id_index").on(t.productId),
    check("quantity_positive_check", sql`${t.quantity} > 0`),
    check("unit_price_positive_check", sql`${t.unitPrice} >= 0`),
    check("unit_cost_positive_check", sql`${t.unitCost} >= 0`),
    check(
      "line_total_check",
      sql`${t.lineTotal} = ${t.quantity} * ${t.unitPrice}`,
    ),
  ],
);

export type SaleItem = typeof saleItems.$inferSelect;
export type NewSaleItem = typeof saleItems.$inferInsert;

export const suppliers = pgTable.withRLS(
  "suppliers",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    name: varchar("name", { length: 255 }).notNull(),
    contactName: varchar("contact_name", { length: 255 }),
    contactEmail: varchar("contact_email", { length: 255 }),
    contactPhone: varchar("contact_phone", { length: 20 }),
    contactAddress: text("contact_address"),
    status: smallint("status").default(1).notNull(), // 1 = active, 0 = inactive
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("suppliers_name_idx").on(t.name),
    index("suppliers_contact_name_idx").on(t.contactName),
    index("suppliers_contact_email_idx").on(t.contactEmail),
    index("suppliers_contact_phone_idx").on(t.contactPhone),
  ],
);

export type Supplier = typeof suppliers.$inferSelect;
export type NewSupplier = typeof suppliers.$inferInsert;

export const purchaseOrders = pgTable.withRLS(
  "purchase_orders",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    supplierId: uuid("supplier_id")
      .references(() => suppliers.id, { onDelete: "restrict" })
      .notNull(),
    status: purchaseOrderStatusEnum().notNull().default("draft"),
    orderedAt: timestamp("ordered_at"),
    receivedAt: timestamp("received_at"),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "restrict" })
      .notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("purchase_orders_supplier_id_index").on(t.supplierId),
    index("purchase_orders_user_id_index").on(t.userId),
    index("purchase_orders_status_index").on(t.status),
  ],
);

export const purchaseOrderItems = pgTable.withRLS(
  "purchase_order_items",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    purchaseOrderId: uuid("purchase_order_id")
      .references(() => purchaseOrders.id, { onDelete: "cascade" })
      .notNull(),
    productId: uuid("product_id")
      .references(() => products.id, { onDelete: "restrict" })
      .notNull(),
    quantityOrdered: integer("quantity_ordered").notNull(),
    quantityReceived: integer("quantity_received").notNull().default(0),
    unitCost: decimal("unit_cost", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("purchase_order_items_purchase_order_id_index").on(t.purchaseOrderId),
    index("purchase_order_items_product_id_index").on(t.productId),
    unique("purchase_order_items_po_product_unique").on(
      t.purchaseOrderId,
      t.productId,
    ),
    check("quantity_ordered_positive_check", sql`${t.quantityOrdered} > 0`),
    check(
      "quantity_received_non_negative_check",
      sql`${t.quantityReceived} >= 0`,
    ),
  ],
);
