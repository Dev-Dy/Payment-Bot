import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, User } from "lucide-react";

interface BotMessageBubbleProps {
  message: string;
  isBot: boolean;
  timestamp: string;
  inlineKeyboard?: Array<{
    text: string;
    callback_data: string;
  }>;
  onButtonClick?: (callbackData: string) => void;
}

export default function BotMessageBubble({
  message,
  isBot,
  timestamp,
  inlineKeyboard,
  onButtonClick
}: BotMessageBubbleProps) {
  return (
    <div className={`flex gap-3 ${isBot ? 'justify-start' : 'justify-end'} mb-4`}>
      {isBot && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary-foreground" />
          </div>
        </div>
      )}
      
      <div className={`max-w-[70%] ${!isBot ? 'order-1' : ''}`}>
        <Card className={`p-3 ${isBot ? 'bg-card' : 'bg-primary text-primary-foreground'}`}>
          <div className="text-sm" data-testid={`text-message-${isBot ? 'bot' : 'user'}`}>
            {message}
          </div>
          
          {isBot && inlineKeyboard && inlineKeyboard.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-3">
              {inlineKeyboard.map((button, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => onButtonClick?.(button.callback_data)}
                  data-testid={`button-inline-${button.callback_data}`}
                >
                  {button.text}
                </Button>
              ))}
            </div>
          )}
        </Card>
        
        <div className={`text-xs text-muted-foreground mt-1 ${!isBot ? 'text-right' : ''}`}>
          {new Date(timestamp).toLocaleTimeString()}
        </div>
      </div>
      
      {!isBot && (
        <div className="flex-shrink-0 order-2">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      )}
    </div>
  );
}