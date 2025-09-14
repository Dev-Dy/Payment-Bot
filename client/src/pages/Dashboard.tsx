import StatsCard from "@/components/StatsCard";
import OrderCard from "@/components/OrderCard";
import BotMessageBubble from "@/components/BotMessageBubble";
import { DollarSign, ShoppingCart, Users, TrendingUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  // todo: remove mock functionality
  const mockStats = [
    {
      title: "Total Revenue",
      value: "$45,231.89",
      change: "+20.1% from last month",
      changeType: "positive" as const,
      icon: DollarSign
    },
    {
      title: "Orders",
      value: "156",
      change: "+8 new today",
      changeType: "positive" as const,
      icon: ShoppingCart
    },
    {
      title: "Active Users",
      value: "1,234",
      change: "+12% this week",
      changeType: "positive" as const,
      icon: Users
    },
    {
      title: "Conversion Rate",
      value: "12.3%",
      change: "+2.1% improvement",
      changeType: "positive" as const,
      icon: TrendingUp
    }
  ];

  const recentOrders = [
    {
      id: "ord_1234567890",
      telegramUserId: "123456789",
      telegramUsername: "alice_smith",
      productName: "Premium Course",
      quantity: 1,
      totalAmount: "299.00",
      currency: "USD",
      status: "paid" as const,
      createdAt: new Date().toISOString(),
    },
    {
      id: "ord_0987654321",
      telegramUserId: "987654321",
      telegramUsername: "bob_jones",
      productName: "E-book Bundle",
      quantity: 2,
      totalAmount: "99.98",
      currency: "USD",
      status: "pending" as const,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    }
  ];

  const recentMessages = [
    {
      message: "New user started the bot! 🎉",
      isBot: true,
      timestamp: new Date(Date.now() - 300000).toISOString(),
    },
    {
      message: "Hi! I want to buy a course",
      isBot: false,
      timestamp: new Date(Date.now() - 240000).toISOString(),
    }
  ];

  const handleViewOrder = (id: string) => console.log('View order:', id);
  const handleRefund = (id: string) => console.log('Refund order:', id);
  const handleButtonClick = (data: string) => console.log('Bot button:', data);

  return (
    <div className="space-y-6" data-testid="page-dashboard">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <Button data-testid="button-add-product">
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {mockStats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentOrders.map(order => (
              <OrderCard
                key={order.id}
                {...order}
                onViewDetails={handleViewOrder}
                onRefund={handleRefund}
              />
            ))}
          </CardContent>
        </Card>

        {/* Recent Bot Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Bot Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {recentMessages.map((msg, index) => (
                <BotMessageBubble
                  key={index}
                  {...msg}
                  onButtonClick={handleButtonClick}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}