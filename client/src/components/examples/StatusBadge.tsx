import StatusBadge from '../StatusBadge';

export default function StatusBadgeExample() {
  return (
    <div className="flex gap-2 flex-wrap">
      <StatusBadge status="pending" />
      <StatusBadge status="paid" />
      <StatusBadge status="cancelled" />
      <StatusBadge status="refunded" />
    </div>
  );
}