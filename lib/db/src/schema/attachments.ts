import { integer, serial, text, timestamp, pgTable } from "drizzle-orm/pg-core";

export const trocAttachmentsTable = pgTable("troc_attachments", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  type: text("type").notNull(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  fileData: text("file_data").notNull(),
  uploadedByUserId: integer("uploaded_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
