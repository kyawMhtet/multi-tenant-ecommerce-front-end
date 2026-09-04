import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { BILLING_PATH } from "@/lib/billing-error";
import { notice, noticeTone, typography } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export function StaffSeatMeter({ used, limit }: { used: number; limit: number | null }) {
  if (limit === null) {
    return (
      <p className={cn(typography.muted, "flex items-center gap-2")}>
        <Users className="size-4 shrink-0" aria-hidden="true" />
        {used} {used === 1 ? "user" : "users"} · Unlimited on your plan
      </p>
    );
  }

  const isFull = used >= limit;

  if (!isFull) {
    return (
      <p className={cn(typography.muted, "flex items-center gap-2")}>
        <Users className="size-4 shrink-0" aria-hidden="true" />
        {used} of {limit} seats used
      </p>
    );
  }

  return (
    <div className={cn(notice, noticeTone.warning)} role="status">
      <Users className="mt-0.5 size-4.5 shrink-0" strokeWidth={2} aria-hidden="true" />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="font-semibold">
          {used} of {limit} seats used
        </p>
        <p className="text-pretty opacity-90">
          Every login counts, including yours. Upgrade to add more people.
        </p>
        <Link
          href={BILLING_PATH}
          className="group mt-1 inline-flex w-fit items-center gap-1.5 font-medium underline underline-offset-4"
        >
          View plans &amp; billing
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
