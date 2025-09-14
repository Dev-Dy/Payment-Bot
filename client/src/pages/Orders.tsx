import OrderCard from "@/components/OrderCard";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import { useState } from "react";

export default function Orders() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // todo: remove mock functionality
  const mockOrders = [
    {
      id: "ord_1234567890abcdef",
      telegramUserId: "123456789",
      telegramUsername: "alice_cooper",
      productName: "Premium Full-Stack Course",
      quantity: 1,
      totalAmount: "299.00",
      currency: "USD",
      status: "paid" as const,
      createdAt: new Date().toISOString(),
    },
    {
      id: "ord_0987654321fedcba",
      telegramUserId: "987654321",
      telegramUsername: "bob_dylan",
      productName: "JavaScript E-book Bundle",
      quantity: 2,
      totalAmount: "99.98",
      currency: "USD",
      status: "pending" as const,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: "ord_abcdef1234567890",
      telegramUserId: "456789123",
      telegramUsername: undefined,
      productName: "React Video Series",
      quantity: 1,
      totalAmount: "79.99",
      currency: "USD",
      status: "cancelled" as const,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "ord_fedcba0987654321",
      telegramUserId: "789123456",
      telegramUsername: "charlie_parker",
      productName: "One-on-One Mentorship",
      quantity: 1,
      totalAmount: "150.00",
      currency: "USD",
      status: "refunded" as const,
      createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      id: "ord_1111222233334444",
      telegramUserId: "111222333",
      telegramUsername: "diana_ross",
      productName: "Premium Full-Stack Course",
      quantity: 1,
      totalAmount: "299.00",
      currency: "USD",
      status: "paid" as const,
      createdAt: new Date(Date.now() - 259200000).toISOString(),
    }
  ];

  const filteredOrders = mockOrders.filter(order => {
    const matchesSearch = 
      order.telegramUsername?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.includes(searchTerm);
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleViewDetails = (id: string) => console.log('View order:', id);
  const handleRefund = (id: string) => console.log('Refund order:', id);

  return (
    <div className="space-y-6" data-testid="page-orders">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">
            Manage and track all customer orders
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status="pending" />
          <span className="text-sm text-muted-foreground">
            {mockOrders.filter(o => o.status === "pending").length} pending
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
            data-testid="input-search-orders"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            {searchTerm || statusFilter !== "all" 
              ? "No orders found matching your filters." 
              : "No orders yet."
            }
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map(order => (
            <OrderCard
              key={order.id}
              {...order}
              onViewDetails={handleViewDetails}
              onRefund={handleRefund}
            />
          ))}
        </div>
      )}
    </div>
  );
}