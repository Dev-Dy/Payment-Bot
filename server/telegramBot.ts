import { storage } from "./storage";
import { OrderStatus, MessageType } from "@shared/schema";

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN must be set');
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BOT_API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Telegram API interfaces
interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface TelegramChat {
  id: number;
  type: string;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
}

interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

interface InlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

export class TelegramBot {
  
  // Track processed update IDs to prevent duplicate processing
  private processedUpdateIds = new Set<number>();
  
  // Clean up old processed update IDs every hour
  constructor() {
    setInterval(() => {
      this.processedUpdateIds.clear();
    }, 60 * 60 * 1000);
  }
  
  async sendMessage(chatId: number, text: string, replyMarkup?: InlineKeyboardMarkup): Promise<void> {
    try {
      const payload: any = {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      };

      if (replyMarkup) {
        payload.reply_markup = replyMarkup;
      }

      const response = await fetch(`${BOT_API_URL}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Telegram API error:', error);
      }
    } catch (error) {
      console.error('Failed to send Telegram message:', error);
    }
  }

  async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
    try {
      const response = await fetch(`${BOT_API_URL}/answerCallbackQuery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Telegram API error:', error);
      }
    } catch (error) {
      console.error('Failed to answer callback query:', error);
    }
  }

  async handleUpdate(update: TelegramUpdate): Promise<void> {
    try {
      // Check for duplicate updates
      if (this.processedUpdateIds.has(update.update_id)) {
        console.log(`Update ${update.update_id} already processed, skipping`);
        return;
      }

      // Mark update as processed
      this.processedUpdateIds.add(update.update_id);

      if (update.message) {
        await this.handleMessage(update.message);
      } else if (update.callback_query) {
        await this.handleCallbackQuery(update.callback_query);
      }
    } catch (error) {
      console.error('Error handling update:', error);
    }
  }

  private async handleMessage(message: TelegramMessage): Promise<void> {
    const { chat, from, text } = message;
    const telegramUserId = from?.id.toString() || chat.id.toString();
    const telegramUsername = from?.username;

    // Log the interaction
    await storage.logBotInteraction({
      telegram_user_id: telegramUserId,
      telegram_username: telegramUsername,
      message_type: MessageType.TEXT,
      message_content: text || '',
      response_sent: '',
    });

    if (!text) return;

    if (text.startsWith('/start')) {
      await this.handleStartCommand(chat.id, telegramUserId, telegramUsername);
    } else if (text.startsWith('/products')) {
      await this.handleProductsCommand(chat.id, telegramUserId, telegramUsername);
    } else if (text.startsWith('/help')) {
      await this.handleHelpCommand(chat.id);
    } else {
      await this.handleUnknownMessage(chat.id);
    }
  }

  private async handleCallbackQuery(callbackQuery: TelegramCallbackQuery): Promise<void> {
    const { id, from, data, message } = callbackQuery;
    const telegramUserId = from.id.toString();
    const telegramUsername = from.username;
    const chatId = message?.chat.id;

    if (!data || !chatId) return;

    // Log the interaction
    await storage.logBotInteraction({
      telegram_user_id: telegramUserId,
      telegram_username: telegramUsername,
      message_type: MessageType.CALLBACK,
      message_content: data,
      response_sent: '',
    });

    if (data === 'show_products') {
      await this.showProducts(chatId, telegramUserId, telegramUsername);
    } else if (data.startsWith('buy_')) {
      const productId = data.replace('buy_', '');
      await this.handlePurchase(chatId, telegramUserId, telegramUsername, productId);
    } else if (data.startsWith('info_')) {
      const productId = data.replace('info_', '');
      await this.showProductInfo(chatId, productId);
    } else if (data === 'my_orders') {
      await this.showUserOrders(chatId, telegramUserId);
    }

    await this.answerCallbackQuery(id);
  }

  private async handleStartCommand(chatId: number, telegramUserId: string, telegramUsername?: string): Promise<void> {
    const welcomeText = `
🎉 <b>Welcome to our store!</b>

I'm your personal shopping assistant bot. Here's what I can help you with:

🛍️ Browse our products
💳 Process secure payments 
📦 Track your orders
❓ Get support

Ready to start shopping?`;

    const keyboard: InlineKeyboardMarkup = {
      inline_keyboard: [
        [{ text: '🛍️ View Products', callback_data: 'show_products' }],
        [{ text: '📦 My Orders', callback_data: 'my_orders' }],
      ]
    };

    await this.sendMessage(chatId, welcomeText, keyboard);
  }

  private async handleProductsCommand(chatId: number, telegramUserId: string, telegramUsername?: string): Promise<void> {
    await this.showProducts(chatId, telegramUserId, telegramUsername);
  }

  private async handleHelpCommand(chatId: number): Promise<void> {
    const helpText = `
🤖 <b>Bot Commands:</b>

/start - Welcome message and main menu
/products - Browse available products
/help - Show this help message

💡 <b>How to buy:</b>
1. Use /products or click "View Products"
2. Select a product you want
3. Complete payment via secure Stripe checkout
4. Receive confirmation and access

🔒 All payments are processed securely through Stripe.`;

    await this.sendMessage(chatId, helpText);
  }

  private async handleUnknownMessage(chatId: number): Promise<void> {
    const text = `
❓ I didn't understand that command.

Use /help to see available commands or click the buttons below:`;

    const keyboard: InlineKeyboardMarkup = {
      inline_keyboard: [
        [{ text: '🛍️ View Products', callback_data: 'show_products' }],
        [{ text: '❓ Help', callback_data: 'help' }],
      ]
    };

    await this.sendMessage(chatId, text, keyboard);
  }

  private async showProducts(chatId: number, telegramUserId: string, telegramUsername?: string): Promise<void> {
    try {
      const products = await storage.getActiveProducts();
      
      if (products.length === 0) {
        await this.sendMessage(chatId, '🚫 No products available at the moment. Please check back later!');
        return;
      }

      let text = '🛍️ <b>Available Products:</b>\n\n';
      const buttons: InlineKeyboardButton[][] = [];

      products.slice(0, 10).forEach((product, index) => { // Limit to 10 products
        text += `${index + 1}. <b>${product.name}</b>\n`;
        text += `💰 ${product.currency} ${product.price}\n`;
        text += `📝 ${product.description}\n\n`;

        buttons.push([
          { text: `💳 Buy ${product.name}`, callback_data: `buy_${product.id}` },
          { text: 'ℹ️ More Info', callback_data: `info_${product.id}` }
        ]);
      });

      buttons.push([{ text: '📦 My Orders', callback_data: 'my_orders' }]);

      const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: buttons
      };

      await this.sendMessage(chatId, text, keyboard);
    } catch (error) {
      console.error('Error showing products:', error);
      await this.sendMessage(chatId, '❌ Sorry, there was an error loading products. Please try again later.');
    }
  }

  private async showProductInfo(chatId: number, productId: string): Promise<void> {
    try {
      const product = await storage.getProduct(productId);
      
      if (!product || !product.active) {
        await this.sendMessage(chatId, '❌ Product not found or unavailable.');
        return;
      }

      const text = `
📦 <b>${product.name}</b>

💰 <b>Price:</b> ${product.currency} ${product.price}

📝 <b>Description:</b>
${product.description}

Ready to purchase?`;

      const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
          [{ text: `💳 Buy Now - ${product.currency} ${product.price}`, callback_data: `buy_${product.id}` }],
          [{ text: '🛍️ Back to Products', callback_data: 'show_products' }],
        ]
      };

      await this.sendMessage(chatId, text, keyboard);
    } catch (error) {
      console.error('Error showing product info:', error);
      await this.sendMessage(chatId, '❌ Sorry, there was an error loading product details.');
    }
  }

  private async handlePurchase(chatId: number, telegramUserId: string, telegramUsername: string | undefined, productId: string): Promise<void> {
    try {
      const product = await storage.getProduct(productId);
      
      if (!product || !product.active) {
        await this.sendMessage(chatId, '❌ Sorry, this product is no longer available.');
        return;
      }

      // Create payment intent via our API
      const baseUrl = process.env.APP_URL || 'http://localhost:5000';
      const response = await fetch(`${baseUrl}/api/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          telegramUserId,
          telegramUsername,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      const paymentData = await response.json();

      const checkoutUrl = `${baseUrl}/checkout?order=${paymentData.orderId}`;
      
      const text = `
💳 <b>Payment Details</b>

📦 <b>Product:</b> ${paymentData.productName}
💰 <b>Amount:</b> ${paymentData.currency} ${paymentData.amount}
🆔 <b>Order ID:</b> ${paymentData.orderId}

🔗 Complete your payment using this secure link:
${checkoutUrl}

⏱️ Your order will be confirmed once payment is completed.
🔒 Payments are securely processed by Stripe.`;

      const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
          [{ text: '🔗 Open Payment Link', url: checkoutUrl }],
          [{ text: '🛍️ Back to Products', callback_data: 'show_products' }],
        ]
      };

      await this.sendMessage(chatId, text, keyboard);

      // Log the purchase attempt
      await storage.logBotInteraction({
        telegram_user_id: telegramUserId,
        telegram_username: telegramUsername,
        message_type: MessageType.CALLBACK,
        message_content: `Purchase initiated for product ${productId}`,
        response_sent: `Payment link sent for order ${paymentData.orderId}`,
      });

    } catch (error) {
      console.error('Error handling purchase:', error);
      await this.sendMessage(chatId, '❌ Sorry, there was an error processing your request. Please try again later.');
    }
  }

  private async showUserOrders(chatId: number, telegramUserId: string): Promise<void> {
    try {
      const orders = await storage.getOrdersByTelegramUserId(telegramUserId);
      
      if (orders.length === 0) {
        await this.sendMessage(chatId, '📦 You have no orders yet. Start shopping to see your orders here!');
        return;
      }

      let text = '📦 <b>Your Orders:</b>\n\n';

      orders.slice(0, 5).forEach((order, index) => { // Show last 5 orders
        const statusEmoji = {
          pending: '⏳',
          paid: '✅',
          cancelled: '❌',
          refunded: '🔄'
        }[order.status] || '❓';

        text += `${index + 1}. <b>${order.product.name}</b>\n`;
        text += `💰 ${order.currency} ${order.total_amount}\n`;
        text += `📅 ${new Date(order.created_at).toLocaleDateString()}\n`;
        text += `${statusEmoji} Status: ${order.status.toUpperCase()}\n\n`;
      });

      const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
          [{ text: '🛍️ Shop More', callback_data: 'show_products' }],
        ]
      };

      await this.sendMessage(chatId, text, keyboard);
    } catch (error) {
      console.error('Error showing user orders:', error);
      await this.sendMessage(chatId, '❌ Sorry, there was an error loading your orders.');
    }
  }
}

export const telegramBot = new TelegramBot();