import OrderCard from '../OrderCard';

export default function OrderCardExample() {
  // todo: remove mock functionality
  const mockOrders = [
    {
      id: "ord_1234567890abcdef",
      telegramUserId: "123456789",
      telegramUsername: "john_doe",
      productName: "Premium Course",
      quantity: 1,
      totalAmount: "299.00",
      currency: "USD",
      status: "paid" as const,
      createdAt: new Date().toISOString(),
    },
    {
      id: "ord_0987654321fedcba",
      telegramUserId: "987654321", 
      telegramUsername: undefined,
      productName: "E-book Bundle",
      quantity: 2,
      totalAmount: "99.98",
      currency: "USD",
      status: "pending" as const,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    }
  ];

  const handleViewDetails = (id: string) => console.log('View order:', id);
  const handleRefund = (id: string) => console.log('Refund order:', id);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {mockOrders.map(order => (
        <OrderCard
          key={order.id}
          {...order}
          onViewDetails={handleViewDetails}
          onRefund={handleRefund}
        />
      ))}
    </div>
  );
}