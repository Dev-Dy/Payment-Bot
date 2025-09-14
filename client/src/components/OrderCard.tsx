import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, User, Package } from "lucide-react";
import StatusBadge from "./StatusBadge";

interface OrderCardProps {
  id: string;
  telegramUserId: string;
  telegramUsername?: string;
  productName: string;
  quantity: number;
  totalAmount: string;
  currency: string;
  status: "pending" | "paid" | "cancelled" | "refunded";
  createdAt: string;
  onViewDetails?: (id: string) => void;
  onRefund?: (id: string) => void;
}

export default function OrderCard({
  id,
  telegramUserId,
  telegramUsername,
  productName,
  quantity,
  totalAmount,
  currency,
  status,
  createdAt,
  onViewDetails,
  onRefund
}: OrderCardProps) {
  return (
    <Card className="hover-elevate" data-testid={`card-order-${id}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            #{id.slice(-8)}
          </Badge>
          <StatusBadge status={status} />
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onViewDetails?.(id)}
          data-testid={`button-view-${id}`}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium" data-testid={`text-username-${id}`}>
              {telegramUsername ? `@${telegramUsername}` : 'No username'}
            </div>
            <div className="text-xs text-muted-foreground">
              ID: {telegramUserId}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium" data-testid={`text-product-${id}`}>
              {productName}
            </div>
            <div className="text-xs text-muted-foreground">
              Quantity: {quantity}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t">
          <div>
            <div className="font-mono text-lg font-bold" data-testid={`text-amount-${id}`}>
              {currency} {totalAmount}
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(createdAt).toLocaleDateString()}
            </div>
          </div>
          {status === "paid" && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onRefund?.(id)}
              data-testid={`button-refund-${id}`}
            >
              Refund
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}