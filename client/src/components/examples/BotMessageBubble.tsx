import BotMessageBubble from '../BotMessageBubble';

export default function BotMessageBubbleExample() {
  // todo: remove mock functionality
  const mockMessages = [
    {
      message: "Welcome to our store! 🛍️ Choose a product to purchase:",
      isBot: true,
      timestamp: new Date(Date.now() - 300000).toISOString(),
      inlineKeyboard: [
        { text: "📚 Premium Course", callback_data: "product_1" },
        { text: "📖 E-book Bundle", callback_data: "product_2" },
        { text: "🎥 Video Series", callback_data: "product_3" },
        { text: "💬 Contact Support", callback_data: "support" }
      ]
    },
    {
      message: "I'm interested in the Premium Course",
      isBot: false,
      timestamp: new Date(Date.now() - 240000).toISOString(),
    },
    {
      message: "Great choice! 🎉 The Premium Course is $299. Click below to proceed with payment:",
      isBot: true,
      timestamp: new Date(Date.now() - 180000).toISOString(),
      inlineKeyboard: [
        { text: "💳 Pay Now", callback_data: "pay_product_1" },
        { text: "ℹ️ More Info", callback_data: "info_product_1" }
      ]
    }
  ];

  const handleButtonClick = (callbackData: string) => {
    console.log('Button clicked:', callbackData);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 bg-background min-h-[400px] border rounded-lg">
      <div className="mb-4 text-center">
        <div className="text-sm text-muted-foreground">Telegram Bot Chat</div>
      </div>
      {mockMessages.map((msg, index) => (
        <BotMessageBubble
          key={index}
          {...msg}
          onButtonClick={handleButtonClick}
        />
      ))}
    </div>
  );
}