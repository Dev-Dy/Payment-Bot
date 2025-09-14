import StatsCard from "@/components/StatsCard";
import OrderCard from "@/components/OrderCard";
import BotMessageBubble from "@/components/BotMessageBubble";
import { DollarSign, ShoppingCart, Users, TrendingUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import type { Order, BotInteraction } from "@shared/schema";

export default function Dashboard() {
  // Fetch real data from APIs
  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  const { data: botInteractions = [] } = useQuery<BotInteraction[]>({
    queryKey: ['/api/bot-interactions'],
    select: (data) => data.slice(0, 10), // Limit to recent interactions
  });

  // Calculate real statistics
  const totalRevenue = orders
    .filter(o => o.status === 'paid')
    .reduce((sum, order) => sum + parseFloat(order.total_amount), 0);

  const todayOrders = orders.filter(o => {
    const today = new Date();
    const orderDate = new Date(o.created_at);
    return orderDate.toDateString() === today.toDateString();
  }).length;

  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  
  const uniqueUsers = new Set(orders.map(o => o.telegram_user_id)).size;

  const mockStats = [
    {
      title: "Total Revenue",
      value: `$${totalRevenue.toFixed(2)}`,
      change: `${orders.length} total orders`,
      changeType: "positive" as const,
      icon: DollarSign
    },
    {
      title: "Orders Today",
      value: todayOrders.toString(),
      change: `${pendingOrders} pending`,
      changeType: "positive" as const,
      icon: ShoppingCart
    },
    {
      title: "Active Users",
      value: uniqueUsers.toString(),
      change: "Unique customers",
      changeType: "positive" as const,
      icon: Users
    },
    {
      title: "Total Orders",
      value: orders.length.toString(),
      change: "All time",
      changeType: "positive" as const,
      icon: TrendingUp
    }
  ];

  const recentOrders = orders
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const recentMessages = botInteractions.map(interaction => ({
    message: interaction.message_content || 'Bot interaction',
    isBot: interaction.message_type === 'command',
    timestamp: interaction.created_at,
  }));

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
            {recentOrders.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No orders yet
              </div>
            ) : (
              recentOrders.map(order => (
                <OrderCard
                  key={order.id}
                  {...order}
                  onViewDetails={handleViewOrder}
                  onRefund={handleRefund}
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Bot Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Bot Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {recentMessages.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No bot activity yet
                </div>
              ) : (
                recentMessages.map((msg, index) => (
                  <BotMessageBubble
                    key={index}
                    {...msg}
                    onButtonClick={handleButtonClick}
                  />
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}