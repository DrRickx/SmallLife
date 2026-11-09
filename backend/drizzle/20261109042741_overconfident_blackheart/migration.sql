CREATE TYPE "payment_method" AS ENUM('cash', 'credit_card', 'bank_transfer', 'mobile_payment');--> statement-breakpoint
CREATE TYPE "purchase_order_status" AS ENUM('draft', 'ordered', 'received', 'cancelled');--> statement-breakpoint
CREATE TYPE "stock_movement_type" AS ENUM('purchase_in', 'sale_out', 'adjustment');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY,
	"name" varchar(255) NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "password_resets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL UNIQUE,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY,
	"sku" varchar(12) NOT NULL UNIQUE,
	"barcode" varchar(13) UNIQUE,
	"category_id" uuid NOT NULL,
	"supplier_id" uuid,
	"cost" numeric(10,2) NOT NULL,
	"price" numeric(10,2) NOT NULL,
	"quantity_on_hand" integer DEFAULT 0 NOT NULL,
	"reorder_level" integer DEFAULT 0 NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "purchase_order_items" (
	"id" uuid PRIMARY KEY,
	"purchase_order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity_ordered" integer NOT NULL,
	"quantity_received" integer DEFAULT 0 NOT NULL,
	"unit_cost" numeric(10,2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "purchase_order_items_po_product_unique" UNIQUE("purchase_order_id","product_id"),
	CONSTRAINT "quantity_ordered_positive_check" CHECK ("quantity_ordered" > 0),
	CONSTRAINT "quantity_received_non_negative_check" CHECK ("quantity_received" >= 0)
);
--> statement-breakpoint
ALTER TABLE "purchase_order_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" uuid PRIMARY KEY,
	"supplier_id" uuid NOT NULL,
	"status" "purchase_order_status" DEFAULT 'draft'::"purchase_order_status" NOT NULL,
	"ordered_at" timestamp,
	"received_at" timestamp,
	"user_id" uuid NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "purchase_orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sale_items" (
	"id" uuid PRIMARY KEY,
	"sale_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10,2) NOT NULL,
	"unit_cost" numeric(10,2) NOT NULL,
	"line_total" numeric(10,2) NOT NULL,
	CONSTRAINT "quantity_positive_check" CHECK ("quantity" > 0),
	CONSTRAINT "unit_price_positive_check" CHECK ("unit_price" >= 0),
	CONSTRAINT "unit_cost_positive_check" CHECK ("unit_cost" >= 0),
	CONSTRAINT "line_total_check" CHECK ("line_total" = "quantity" * "unit_price")
);
--> statement-breakpoint
ALTER TABLE "sale_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales" (
	"id" uuid PRIMARY KEY,
	"user_id" uuid,
	"receipt_no" varchar(20) NOT NULL UNIQUE,
	"paymentMethod" "payment_method" DEFAULT 'cash'::"payment_method" NOT NULL,
	"subtotal" numeric(10,2) NOT NULL,
	"tax" numeric(10,2) NOT NULL,
	"total" numeric(10,2) NOT NULL,
	"amount_tendered" numeric(10,2) NOT NULL,
	"change_due" numeric(10,2) NOT NULL,
	"status" int2 DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "amount_tendered_check" CHECK ("amount_tendered" >= "total"),
	CONSTRAINT "change_due_check" CHECK ("change_due" = "amount_tendered" - "total"),
	CONSTRAINT "status_check" CHECK ("status" IN (-1, 0, 1))
);
--> statement-breakpoint
ALTER TABLE "sales" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"refresh_hash" text NOT NULL UNIQUE,
	"user_agent" text,
	"ip" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY,
	"product_id" uuid NOT NULL,
	"type" "stock_movement_type" DEFAULT 'sale_out'::"stock_movement_type" NOT NULL,
	"quantity" integer NOT NULL,
	"reason" text,
	"reference_id" uuid,
	"unit_cost" numeric(10,2),
	"user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "quantity_positive_check" CHECK ("quantity" > 0)
);
--> statement-breakpoint
ALTER TABLE "stock_movements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY,
	"name" varchar(255) NOT NULL,
	"contact_name" varchar(255),
	"contact_email" varchar(255),
	"contact_phone" varchar(20),
	"contact_address" text,
	"status" int2 DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "suppliers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "token_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "failed_logins" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "locked_until" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_key" UNIQUE("email");--> statement-breakpoint
CREATE INDEX "purchase_order_items_purchase_order_id_index" ON "purchase_order_items" ("purchase_order_id");--> statement-breakpoint
CREATE INDEX "purchase_order_items_product_id_index" ON "purchase_order_items" ("product_id");--> statement-breakpoint
CREATE INDEX "purchase_orders_supplier_id_index" ON "purchase_orders" ("supplier_id");--> statement-breakpoint
CREATE INDEX "purchase_orders_user_id_index" ON "purchase_orders" ("user_id");--> statement-breakpoint
CREATE INDEX "purchase_orders_status_index" ON "purchase_orders" ("status");--> statement-breakpoint
CREATE INDEX "sale_items_sale_id_index" ON "sale_items" ("sale_id");--> statement-breakpoint
CREATE INDEX "sale_items_product_id_index" ON "sale_items" ("product_id");--> statement-breakpoint
CREATE INDEX "sales_user_id_index" ON "sales" ("user_id");--> statement-breakpoint
CREATE INDEX "sales_receipt_no_index" ON "sales" ("receipt_no");--> statement-breakpoint
CREATE INDEX "sales_payment_method_index" ON "sales" ("paymentMethod");--> statement-breakpoint
CREATE INDEX "sales_status_index" ON "sales" ("status");--> statement-breakpoint
CREATE INDEX "stock_movements_product_id_index" ON "stock_movements" ("product_id");--> statement-breakpoint
CREATE INDEX "stock_movements_reference_id_index" ON "stock_movements" ("reference_id");--> statement-breakpoint
CREATE INDEX "stock_movements_user_id_index" ON "stock_movements" ("user_id");--> statement-breakpoint
CREATE INDEX "suppliers_name_idx" ON "suppliers" ("name");--> statement-breakpoint
CREATE INDEX "suppliers_contact_name_idx" ON "suppliers" ("contact_name");--> statement-breakpoint
CREATE INDEX "suppliers_contact_email_idx" ON "suppliers" ("contact_email");--> statement-breakpoint
CREATE INDEX "suppliers_contact_phone_idx" ON "suppliers" ("contact_phone");--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_suppliers_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_purchase_orders_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_sales_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_reference_id_sales_id_fkey" FOREIGN KEY ("reference_id") REFERENCES "sales"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;