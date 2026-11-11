import { sql } from "drizzle-orm";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const plannerData = sqliteTable("planner_data", {
  userId: text("user_id").primaryKey().notNull(),
  dataJson: text("data_json").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});
