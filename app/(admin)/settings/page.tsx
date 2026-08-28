"use client";

import { ApiError } from "@/lib/api-client";
import { useTenant } from "@/lib/hooks/useTenant";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { ShopProfileForm } from "@/components/admin/ShopProfileForm";

export default function SettingsPage() {
  const { data: tenant, isPending, error: queryError } = useTenant();

  const error = queryError
    ? queryError instanceof ApiError
      ? queryError.message
      : "Could not load settings."
    : null;

  return (
    <PageContainer size="lg">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Settings"
          description="Your shop's profile — what customers see on your storefront."
          backHref="/dashboard"
          backLabel="Back to dashboard"
        />

        {error && <ErrorState message={error} />}

        {!error && isPending && <LoadingState rows={6} />}

        {/* Keyed to the form's own state, so it only mounts once the tenant
            is loaded — the form seeds itself from this prop and then owns
            every field, rather than re-deriving them on each refetch. */}
        {tenant && <ShopProfileForm tenant={tenant} />}

      </div>
    </PageContainer>
  );
}
