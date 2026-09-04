import { Lock, ShieldAlert } from "lucide-react";
import { accessRefusalTitle, type AccessRefusal } from "@/lib/access-error";
import { notice, noticeTone } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export function AccessNotice({
  refusal,
  className,
}: {
  refusal: AccessRefusal;
  className?: string;
}) {
  const isSuspended = refusal.reason === "shop_suspended";
  const Icon = isSuspended ? ShieldAlert : Lock;

  return (
    <div
      className={cn(notice, isSuspended ? noticeTone.danger : noticeTone.warning, className)}
      role="status"
    >
      <Icon className="mt-0.5 size-4.5 shrink-0" strokeWidth={2} aria-hidden="true" />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="font-semibold">{accessRefusalTitle(refusal)}</p>
        <p className="text-pretty opacity-90">{refusal.message}</p>
        {isSuspended && refusal.detail && (
          <p className="text-pretty opacity-90">{refusal.detail}</p>
        )}
      </div>
    </div>
  );
}
