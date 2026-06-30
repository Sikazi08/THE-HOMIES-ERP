import { json, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const sessionTable = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
});
