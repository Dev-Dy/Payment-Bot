import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { insertProductSchema, insertOrderSchema, OrderStatus } from "@shared/schema";
import { telegramBot } from "./telegramBot";
import { z } from "zod";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

// SECURITY: Enforce STRIPE_WEBHOOK_SECRET in production environments
const isProduction = process.env.NODE_ENV === 'production' || process.env.REPL_ENVIRONMENT === 'production' || process.env.APP_URL?.includes('replit.app');

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  if (isProduction) {
    // CRITICAL: Fail startup in production if webhook secret is missing
    console.error('CRITICAL ERROR: STRIPE_WEBHOOK_SECRET must be set in production environment');
    console.error('This is required for webhook security and prevents unauthorized access');
    process.exit(1);
  } else {
    console.warn('WARNING: STRIPE_WEBHOOK_SECRET not found. Webhook signature verification will be skipped in development.');
  }
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
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

// SECURITY: URL validation for webhook endpoints
function isValidWebhookUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    // Only allow HTTPS URLs (except localhost for development)
    if (parsedUrl.protocol !== 'https:' && parsedUrl.hostname !== 'localhost') {
      return false;
    }
    // Block private/internal IP ranges
    const hostname = parsedUrl.hostname.toLowerCase();
    if (hostname === '127.0.0.1' || hostname === '::1' || hostname.startsWith('192.168.') || 
        hostname.startsWith('10.') || hostname.startsWith('172.16.') || hostname === 'metadata.google.internal') {
      return parsedUrl.hostname === 'localhost'; // Only allow localhost explicitly
    }
    return true;
  } catch {
    return false;
  }
}

// Webhook event handlers
async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  try {
    // Find order by payment intent ID
    const order = await storage.getOrderByPaymentIntentId(paymentIntent.id);
    if (order) {
      // Mark order as paid
      await storage.updateOrderStatus(order.id, OrderStatus.PAID);
      
      // Send Telegram notification for successful payment
      const successMessage = `🎉 <b>Payment Successful!</b>

✅ Your payment for <b>${order.product.name}</b> has been processed successfully.

💰 <b>Amount:</b> ${order.currency} ${order.total_amount}
🆔 <b>Order ID:</b> ${order.id}
📅 <b>Date:</b> ${new Date().toLocaleString()}

Thank you for your purchase! 🛍️`;
      
      await telegramBot.sendMessage(parseInt(order.telegram_user_id), successMessage);
      
      // Log bot interaction for successful payment
      await storage.logBotInteraction({
        telegram_user_id: order.telegram_user_id,
        telegram_username: order.telegram_username,
        message_type: "payment_success",
        message_content: `Payment successful for ${order.product.name}`,
        response_sent: "Payment success notification sent",
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
      
      // Send Telegram notification for failed payment
      const failureMessage = `❌ <b>Payment Failed</b>

💳 Unfortunately, your payment for <b>${order.product.name}</b> could not be processed.

💰 <b>Amount:</b> ${order.currency} ${order.total_amount}
🆔 <b>Order ID:</b> ${order.id}

Please try again or contact support if the issue persists.`;
      
      await telegramBot.sendMessage(parseInt(order.telegram_user_id), failureMessage);
      
      // Log bot interaction for failed payment
      await storage.logBotInteraction({
        telegram_user_id: order.telegram_user_id,
        telegram_username: order.telegram_username,
        message_type: "payment_failed",
        message_content: `Payment failed for ${order.product.name}`,
        response_sent: "Payment failure notification sent",
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
      
      // Send Telegram notification for canceled payment
      const cancelMessage = `⏹️ <b>Payment Canceled</b>

🚫 Your payment for <b>${order.product.name}</b> was canceled.

💰 <b>Amount:</b> ${order.currency} ${order.total_amount}
🆔 <b>Order ID:</b> ${order.id}

You can restart the payment process anytime by visiting the product again.`;
      
      await telegramBot.sendMessage(parseInt(order.telegram_user_id), cancelMessage);
      
      // Log bot interaction for canceled payment
      await storage.logBotInteraction({
        telegram_user_id: order.telegram_user_id,
        telegram_username: order.telegram_username,
        message_type: "payment_canceled",
        message_content: `Payment canceled for ${order.product.name}`,
        response_sent: "Payment cancellation notification sent",
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
        
        // Send Telegram notification for refund
        const refundMessage = `🔄 <b>Refund Processed</b>

✅ Your refund for <b>${order.product.name}</b> has been processed successfully.

💰 <b>Refunded Amount:</b> ${charge.currency.toUpperCase()} ${(charge.amount_refunded / 100).toFixed(2)}
🆔 <b>Order ID:</b> ${order.id}
📅 <b>Date:</b> ${new Date().toLocaleString()}

The refund will appear in your account within 5-10 business days.`;
        
        await telegramBot.sendMessage(parseInt(order.telegram_user_id), refundMessage);
        
        // Log bot interaction for refund
        await storage.logBotInteraction({
          telegram_user_id: order.telegram_user_id,
          telegram_username: order.telegram_username,
          message_type: "payment_refunded",
          message_content: `Refund processed for ${order.product.name}`,
          response_sent: "Refund notification sent",
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

  // SECURITY: Public order endpoint for checkout - sanitized response without PII
  app.get("/api/orders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const order = await storage.getOrderById(id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      // SECURITY: Sanitize response - remove PII data for public checkout access
      const publicOrder = {
        id: order.id,
        product_id: order.product_id,
        quantity: order.quantity,
        total_amount: order.total_amount,
        currency: order.currency,
        status: order.status,
        created_at: order.created_at,
        product: {
          id: order.product.id,
          name: order.product.name,
          description: order.product.description,
          price: order.product.price,
          currency: order.product.currency,
          image_url: order.product.image_url,
        }
        // Removed: telegram_user_id, telegram_username, stripe_payment_intent_id
      };
      
      res.json(publicOrder);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create payment intent for existing order (for checkout page)
  app.post("/api/orders/:id/payment-intent", async (req, res) => {
    try {
      const { id } = req.params;
      const order = await storage.getOrderById(id);
      
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      if (order.status !== OrderStatus.PENDING) {
        return res.status(400).json({ error: "Order cannot be paid" });
      }

      // If payment intent already exists, retrieve it
      if (order.stripe_payment_intent_id) {
        const paymentIntent = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id);
        return res.json({ 
          clientSecret: paymentIntent.client_secret,
          orderId: order.id 
        });
      }

      // Create new payment intent
      const priceInCents = Math.round(parseFloat(order.total_amount) * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: priceInCents,
        currency: order.currency.toLowerCase(),
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          orderId: order.id,
          telegramUserId: order.telegram_user_id,
          productId: order.product_id,
          productName: order.product.name,
        },
      });

      // Update order with payment intent ID
      await storage.updateOrderPaymentIntentId(order.id, paymentIntent.id);

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        orderId: order.id 
      });
    } catch (error: any) {
      console.error("Payment intent creation error:", error);
      res.status(500).json({ error: "Failed to create payment intent" });
    }
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

  // Telegram webhook endpoint with security verification
  app.post("/api/telegram-webhook", async (req, res) => {
    try {
      // Verify webhook secret token if configured
      const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;
      if (secretToken) {
        const providedToken = req.headers['x-telegram-bot-api-secret-token'];
        if (!providedToken || providedToken !== secretToken) {
          console.warn('Unauthorized Telegram webhook request');
          return res.status(401).json({ error: "Unauthorized" });
        }
      }

      await telegramBot.handleUpdate(req.body);
      res.json({ ok: true });
    } catch (error: any) {
      console.error("Error handling Telegram webhook:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // SECURITY: Webhook management endpoint - requires admin authentication
  app.post("/api/set-telegram-webhook", async (req, res) => {
    try {
      // SECURITY: Require admin API key for webhook management
      const adminApiKey = req.headers['x-admin-api-key'];
      if (!process.env.ADMIN_API_KEY || adminApiKey !== process.env.ADMIN_API_KEY) {
        console.warn('Unauthorized webhook management attempt:', req.ip);
        return res.status(401).json({ error: "Unauthorized - Admin API key required" });
      }

      const { url } = req.body;
      
      // SECURITY: Validate webhook URL format and domain
      if (url && !isValidWebhookUrl(url)) {
        return res.status(400).json({ error: "Invalid webhook URL format" });
      }
      
      const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const webhookUrl = url || `${baseUrl}/api/telegram-webhook`;
      
      const webhookPayload: any = {
        url: webhookUrl,
      };

      // Add secret token if configured
      if (process.env.TELEGRAM_WEBHOOK_SECRET) {
        webhookPayload.secret_token = process.env.TELEGRAM_WEBHOOK_SECRET;
      }

      const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      });

      const result = await response.json();
      
      if (result.ok) {
        console.log(`Webhook set by admin to: ${webhookUrl}`);
        res.json({ success: true, webhook_url: webhookUrl, secret_configured: !!process.env.TELEGRAM_WEBHOOK_SECRET });
      } else {
        res.status(400).json({ error: result.description });
      }
    } catch (error: any) {
      console.error("Error setting webhook:", error);
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}