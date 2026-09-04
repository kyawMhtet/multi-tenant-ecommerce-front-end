import { Badge } from "@/components/ui/badge";
import { paymentStatusClassName, paymentStatusLabel, statusPill } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        statusPill,
        paymentStatusClassName[status],
        !paymentStatusClassName[status] && "capitalize",
        className,
      )}
    >
      {paymentStatusLabel[status] ?? status}
    </Badge>
  );
}
