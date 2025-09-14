import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { insertProductSchema, insertOrderSchema, OrderStatus } from "@shared/schema";
import { z } from "zod";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  console.warn('WARNING: STRIPE_WEBHOOK_SECRET not found. Webhook signature verification will be skipped in development.');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});

// Validation schemas
const createPaymentIntentSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  telegramUserId: z.string().min(1, "Telegram User ID is required"),
  telegramUsername: z.string().optional(),
});

// Track processed webhook events to prevent duplicate processing
const processedEvents = new Set<string>();

// Clean up old processed events every hour
setInterval(() => {
  processedEvents.clear();
}, 60 * 60 * 1000);

// Webhook event handlers
async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  try {
    // Find order by payment intent ID
    const order = await storage.getOrderByPaymentIntentId(paymentIntent.id);
    if (order) {
      // Mark order as paid
      await storage.updateOrderStatus(order.id, OrderStatus.PAID);
      
      // Log bot interaction for successful payment
      await storage.logBotInteraction({
        telegram_user_id: order.telegram_user_id,
        telegram_username: order.telegram_username,
        message_type: "payment_success",
        message_content: `Payment successful for ${order.product.name}`,
        response_sent: "Payment confirmed",
      });

      console.log(`Payment succeeded for order ${order.id} (Amount: ${paymentIntent.amount_received / 100} ${paymentIntent.currency.toUpperCase()})`);
    } else {
      console.warn(`Payment succeeded but no order found for payment intent ${paymentIntent.id}`);
    }
  } catch (error) {
    console.error("Error processing payment success:", error);
    throw error;
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  try {
    const order = await storage.getOrderByPaymentIntentId(paymentIntent.id);
    if (order) {
      await storage.updateOrderStatus(order.id, OrderStatus.CANCELLED);
      
      // Log bot interaction for failed payment
      await storage.logBotInteraction({
        telegram_user_id: order.telegram_user_id,
        telegram_username: order.telegram_username,
        message_type: "payment_failed",
        message_content: `Payment failed for ${order.product.name}`,
        response_sent: "Payment could not be processed",
      });

      console.log(`Payment failed for order ${order.id}`);
    } else {
      console.warn(`Payment failed but no order found for payment intent ${paymentIntent.id}`);
    }
  } catch (error) {
    console.error("Error processing payment failure:", error);
    throw error;
  }
}

async function handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  try {
    const order = await storage.getOrderByPaymentIntentId(paymentIntent.id);
    if (order) {
      await storage.updateOrderStatus(order.id, OrderStatus.CANCELLED);
      
      // Log bot interaction for canceled payment
      await storage.logBotInteraction({
        telegram_user_id: order.telegram_user_id,
        telegram_username: order.telegram_username,
        message_type: "payment_canceled",
        message_content: `Payment canceled for ${order.product.name}`,
        response_sent: "Payment was canceled",
      });

      console.log(`Payment canceled for order ${order.id}`);
    } else {
      console.warn(`Payment canceled but no order found for payment intent ${paymentIntent.id}`);
    }
  } catch (error) {
    console.error("Error processing payment cancellation:", error);
    throw error;
  }
}

async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
  try {
    const paymentIntentId = charge.payment_intent as string;
    if (paymentIntentId) {
      const order = await storage.getOrderByPaymentIntentId(paymentIntentId);
      if (order) {
        await storage.updateOrderStatus(order.id, OrderStatus.REFUNDED);
        
        // Log bot interaction for refund
        await storage.logBotInteraction({
          telegram_user_id: order.telegram_user_id,
          telegram_username: order.telegram_username,
          message_type: "payment_refunded",
          message_content: `Refund processed for ${order.product.name}`,
          response_sent: "Your payment has been refunded",
        });

        console.log(`Charge refunded for order ${order.id} (Amount: ${charge.amount_refunded / 100} ${charge.currency.toUpperCase()})`);
      } else {
        console.warn(`Charge refunded but no order found for payment intent ${paymentIntentId}`);
      }
    }
  } catch (error) {
    console.error("Error processing charge refund:", error);
    throw error;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Product routes
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getAllProducts();
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/products/active", async (req, res) => {
    try {
      const products = await storage.getActiveProducts();
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      res.json(product);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(id, updates);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteProduct(id);
      if (!deleted) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Order routes
  app.get("/api/orders", async (req, res) => {
    try {
      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/orders/status/:status", async (req, res) => {
    try {
      const { status } = req.params;
      const orders = await storage.getOrdersByStatus(status);
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Payment processing route for Telegram bot
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      // Validate request body
      const validationResult = createPaymentIntentSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid request data", 
          details: validationResult.error.issues 
        });
      }
      
      const { productId, telegramUserId, telegramUsername } = validationResult.data;
      
      // Get product details
      const product = await storage.getProduct(productId);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      if (!product.active) {
        return res.status(400).json({ error: "Product is not available" });
      }

      // Validate price
      const priceInCents = Math.round(parseFloat(product.price) * 100);
      if (priceInCents < 50) { // Stripe minimum
        return res.status(400).json({ error: "Product price too low for payment processing" });
      }

      // Create order first
      const orderData = {
        telegram_user_id: telegramUserId,
        telegram_username: telegramUsername,
        product_id: productId,
        quantity: 1,
        total_amount: product.price,
        currency: product.currency,
        status: OrderStatus.PENDING,
      };

      const order = await storage.createOrder(orderData);

      // Create Stripe payment intent with automatic payment methods
      const paymentIntent = await stripe.paymentIntents.create({
        amount: priceInCents,
        currency: product.currency.toLowerCase(),
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          orderId: order.id,
          telegramUserId,
          productId,
          productName: product.name,
        },
      });

      // Update order with payment intent ID
      await storage.updateOrderPaymentIntentId(order.id, paymentIntent.id);

      // Log bot interaction for payment creation
      await storage.logBotInteraction({
        telegram_user_id: telegramUserId,
        telegram_username: telegramUsername,
        message_type: "payment_created",
        message_content: `Payment intent created for ${product.name}`,
        response_sent: "Payment link generated",
      });

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        orderId: order.id,
        productName: product.name,
        amount: product.price,
        currency: product.currency,
      });
    } catch (error: any) {
      console.error("Payment intent creation error:", error);
      res.status(500).json({ error: "Failed to create payment intent" });
    }
  });

  // Stripe webhook handler - IMPORTANT: Raw body middleware configured in index.ts
  app.post("/api/stripe-webhook", async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event: Stripe.Event;

    try {
      if (process.env.STRIPE_WEBHOOK_SECRET) {
        // Verify webhook signature in production
        event = stripe.webhooks.constructEvent(req.body, sig as string, process.env.STRIPE_WEBHOOK_SECRET);
      } else {
        // Development mode - skip signature verification but log warning
        console.warn('WARNING: Webhook signature verification skipped - STRIPE_WEBHOOK_SECRET not set');
        event = req.body;
      }
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Idempotency check
    if (processedEvents.has(event.id)) {
      console.log(`Event ${event.id} already processed, skipping`);
      return res.json({ received: true, status: 'already_processed' });
    }

    // Mark event as processed
    processedEvents.add(event.id);

    console.log(`Processing webhook event: ${event.type} (${event.id})`);

    // Handle the event
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.canceled':
          await handlePaymentCanceled(event.data.object as Stripe.PaymentIntent);
          break;

        case 'charge.refunded':
          await handleChargeRefunded(event.data.object as Stripe.Charge);
          break;

        default:
          console.log(`Unhandled event type ${event.type}`);
      }
    } catch (error) {
      console.error(`Error processing webhook event ${event.type}:`, error);
      return res.status(500).json({ error: 'Webhook processing failed' });
    }

    res.json({ received: true, eventId: event.id });
  });

  // Bot interactions
  app.get("/api/bot-interactions", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const interactions = await storage.getRecentBotInteractions(limit);
      res.json(interactions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}