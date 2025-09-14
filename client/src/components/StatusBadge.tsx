import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: "pending" | "paid" | "cancelled" | "refunded";
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const variants = {
    pending: "bg-orange-100 text-orange-800 border-orange-200",
    paid: "bg-green-100 text-green-800 border-green-200", 
    cancelled: "bg-gray-100 text-gray-800 border-gray-200",
    refunded: "bg-red-100 text-red-800 border-red-200",
  };

  const labels = {
    pending: "Pending",
    paid: "Paid",
    cancelled: "Cancelled", 
    refunded: "Refunded",
  };

  return (
    <Badge 
      className={`${variants[status]} ${className}`}
      data-testid={`status-badge-${status}`}
    >
      {labels[status]}
    </Badge>
  );
}