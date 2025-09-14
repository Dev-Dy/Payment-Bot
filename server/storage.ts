import { 
  products, 
  orders, 
  bot_interactions,
  type Product, 
  type InsertProduct,
  type Order,
  type InsertOrder,
  type OrderWithProduct,
  type BotInteraction,
  type InsertBotInteraction
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Product operations
  getProduct(id: string): Promise<Product | undefined>;
  getAllProducts(): Promise<Product[]>;
  getActiveProducts(): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;

  // Order operations
  getOrder(id: string): Promise<OrderWithProduct | undefined>;
  getOrderByPaymentIntentId(paymentIntentId: string): Promise<OrderWithProduct | undefined>;
  getOrdersByTelegramUserId(telegramUserId: string): Promise<OrderWithProduct[]>;
  getAllOrders(): Promise<OrderWithProduct[]>;
  getOrdersByStatus(status: string): Promise<OrderWithProduct[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
  updateOrderPaymentIntentId(id: string, paymentIntentId: string): Promise<Order | undefined>;

  // Bot interaction operations
  logBotInteraction(interaction: InsertBotInteraction): Promise<BotInteraction>;
  getRecentBotInteractions(limit?: number): Promise<BotInteraction[]>;
}

export class DatabaseStorage implements IStorage {
  // Product operations
  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async getAllProducts(): Promise<Product[]> {
    return await db.select().from(products).orderBy(desc(products.created_at));
  }

  async getActiveProducts(): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.active, true)).orderBy(desc(products.created_at));
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values(insertProduct).returning();
    return product;
  }

  async updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product | undefined> {
    const [product] = await db.update(products)
      .set(updates)
      .where(eq(products.id, id))
      .returning();
    return product || undefined;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Order operations
  async getOrder(id: string): Promise<OrderWithProduct | undefined> {
    const [result] = await db
      .select()
      .from(orders)
      .leftJoin(products, eq(orders.product_id, products.id))
      .where(eq(orders.id, id));
    
    if (!result) return undefined;
    
    return {
      ...result.orders,
      product: result.products!
    };
  }

  async getAllOrders(): Promise<OrderWithProduct[]> {
    const results = await db
      .select()
      .from(orders)
      .leftJoin(products, eq(orders.product_id, products.id))
      .orderBy(desc(orders.created_at));
    
    return results.map(result => ({
      ...result.orders,
      product: result.products!
    }));
  }

  async getOrdersByStatus(status: string): Promise<OrderWithProduct[]> {
    const results = await db
      .select()
      .from(orders)
      .leftJoin(products, eq(orders.product_id, products.id))
      .where(eq(orders.status, status))
      .orderBy(desc(orders.created_at));
    
    return results.map(result => ({
      ...result.orders,
      product: result.products!
    }));
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(insertOrder).returning();
    return order;
  }

  async getOrderByPaymentIntentId(paymentIntentId: string): Promise<OrderWithProduct | undefined> {
    const [result] = await db
      .select()
      .from(orders)
      .leftJoin(products, eq(orders.product_id, products.id))
      .where(eq(orders.stripe_payment_intent_id, paymentIntentId));
    
    if (!result) return undefined;
    
    return {
      ...result.orders,
      product: result.products!
    };
  }

  async getOrdersByTelegramUserId(telegramUserId: string): Promise<OrderWithProduct[]> {
    const results = await db
      .select()
      .from(orders)
      .leftJoin(products, eq(orders.product_id, products.id))
      .where(eq(orders.telegram_user_id, telegramUserId))
      .orderBy(desc(orders.created_at));
    
    return results.map(result => ({
      ...result.orders,
      product: result.products!
    }));
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const [order] = await db.update(orders)
      .set({ status, updated_at: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return order || undefined;
  }

  async updateOrderPaymentIntentId(id: string, paymentIntentId: string): Promise<Order | undefined> {
    const [order] = await db.update(orders)
      .set({ stripe_payment_intent_id: paymentIntentId, updated_at: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return order || undefined;
  }

  // Bot interaction operations
  async logBotInteraction(insertInteraction: InsertBotInteraction): Promise<BotInteraction> {
    const [interaction] = await db.insert(bot_interactions).values(insertInteraction).returning();
    return interaction;
  }

  async getRecentBotInteractions(limit = 50): Promise<BotInteraction[]> {
    return await db
      .select()
      .from(bot_interactions)
      .orderBy(desc(bot_interactions.created_at))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
