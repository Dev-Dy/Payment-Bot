import StatsCard from '../StatsCard';
import { DollarSign, ShoppingCart, Users, TrendingUp } from 'lucide-react';

export default function StatsCardExample() {
  // todo: remove mock functionality
  const mockStats = [
    {
      title: "Total Revenue",
      value: "$12,345",
      change: "+12% from last month",
      changeType: "positive" as const,
      icon: DollarSign
    },
    {
      title: "Orders",
      value: "89",
      change: "+3 new today",
      changeType: "positive" as const,
      icon: ShoppingCart
    },
    {
      title: "Active Users",
      value: "234",
      change: "-2% from last week",
      changeType: "negative" as const,
      icon: Users
    },
    {
      title: "Conversion Rate",
      value: "3.2%",
      change: "+0.5% improvement",
      changeType: "positive" as const,
      icon: TrendingUp
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
      {mockStats.map((stat, index) => (
        <StatsCard key={index} {...stat} />
      ))}
    </div>
  );
}