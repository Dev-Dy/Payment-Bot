import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Products table for the bot catalog
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  image_url: text("image_url"),
  active: boolean("active").notNull().default(true),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Orders from Telegram users
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  telegram_user_id: text("telegram_user_id").notNull(),
  telegram_username: text("telegram_username"),
  product_id: varchar("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull().default(1),
  total_amount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, paid, cancelled, refunded
  stripe_payment_intent_id: text("stripe_payment_intent_id"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Bot interactions log
export const bot_interactions = pgTable("bot_interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  telegram_user_id: text("telegram_user_id").notNull(),
  telegram_username: text("telegram_username"),
  message_type: varchar("message_type", { length: 50 }).notNull(), // command, callback, text
  message_content: text("message_content"),
  response_sent: text("response_sent"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  created_at: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertBotInteractionSchema = createInsertSchema(bot_interactions).omit({
  id: true,
  created_at: true,
});

// Types
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export type InsertBotInteraction = z.infer<typeof insertBotInteractionSchema>;
export type BotInteraction = typeof bot_interactions.$inferSelect;

// Extended types for joins
export type OrderWithProduct = Order & {
  product: Product;
};

// Status enums
export const OrderStatus = {
  PENDING: "pending",
  PAID: "paid", 
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
} as const;

export const MessageType = {
  COMMAND: "command",
  CALLBACK: "callback", 
  TEXT: "text",
} as const;

// Relations
export const productsRelations = relations(products, ({ many }) => ({
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  product: one(products, {
    fields: [orders.product_id],
    references: [products.id],
  }),
}));