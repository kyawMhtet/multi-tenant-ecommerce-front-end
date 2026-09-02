import { ApiError } from "@/lib/api-client";
import { parseBillingError } from "@/lib/billing-error";
import { BillingNotice } from "@/components/shared/BillingNotice";
import { ErrorState } from "@/components/shared/ErrorState";

/**
 * The error line for anything that talks to the API.
 *
 * Exists so that no screen has to remember billing is a thing. Every admin
 * surface already computed its error the same way —
 *
 *   error instanceof ApiError ? error.message : "Could not load X."
 *
 * — which renders a 402 as a flat sentence with nowhere to go, and that is
 * precisely the regression this replaces: the backend went to the trouble of
 * answering 402 (not 403) with a machine-readable `reason` so the shop could
 * be shown a way out, and a generic error string threw all of it away.
 *
 * Routing that decision through one component means a screen added later gets
 * the upgrade prompt for free rather than having to opt in — the failure mode
 * of a hook you must remember to call is a screen that silently doesn't.
 */
export function ApiErrorState({
  error,
  // What to say when the failure isn't an ApiError at all (a network drop, a
  // thrown TypeError) — name the screen, e.g. "Could not load reports."
  fallback,
  className,
}: {
  error: unknown;
  fallback: string;
  className?: string;
}) {
  if (!error) return null;

  const refusal = parseBillingError(error);
  if (refusal) return <BillingNotice refusal={refusal} className={className} />;

  return <ErrorState message={error instanceof ApiError ? error.message : fallback} />;
}
