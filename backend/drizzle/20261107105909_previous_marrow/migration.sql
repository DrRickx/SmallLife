CREATE TYPE "role" AS ENUM('owner', 'sales');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY,
	"username" varchar(255) NOT NULL UNIQUE,
	"password" varchar(255) NOT NULL,
	"role" "role" DEFAULT 'sales'::"role" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
