import "dotenv/config";
import postgres from "postgres";

console.log("url set?", !!process.env.DATABASE_URL);

const sql = postgres(process.env.DATABASE_URL!, {
  prepare: false,
  connect_timeout: 5, // seconds; default is 30
});

sql`select 1 as ok`
  .then((r) => console.log("db ok", r))
  .catch((e) => console.error("db error:", e))
  .finally(() => sql.end());
