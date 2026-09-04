"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTenant } from "@/lib/hooks/useTenant";
import { useRole } from "@/lib/hooks/useRole";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ApiErrorState } from "@/components/shared/ApiErrorState";
import { ShopProfileForm } from "@/components/admin/ShopProfileForm";
import { DeliveryProvidersSection } from "@/components/admin/DeliveryProvidersSection";
import { SettingsSection } from "@/components/admin/SettingsSection";
import { RoleRequiredNotice } from "@/components/admin/RoleRequiredNotice";
import { buttonVariants } from "@/components/ui/button";
import { controls } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { canManage, isOwner } = useRole();
  const { data: tenant, isPending, error: queryError } = useTenant();

  if (!canManage) {
    return (
      <PageContainer size="lg">
        <div className="flex flex-col gap-6">
          <PageHeader
            title="Settings"
            description="Your shop's profile and the people who work in it."
            backHref="/dashboard"
            backLabel="Back to dashboard"
          />
          <RoleRequiredNotice minimum="manager" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="lg">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Settings"
          description={
            isOwner
              ? "Your shop's profile — what customers see on your storefront."
              : "Your shop's couriers. Only an owner can change the shop profile."
          }
          backHref="/dashboard"
          backLabel="Back to dashboard"
        />

        {isOwner && (
          <>
            <ApiErrorState error={queryError} fallback="Could not load settings." />

            {!queryError && isPending && <LoadingState rows={6} />}

            {/* Keyed to the form's own state, so it only mounts once the tenant
                is loaded — the form seeds itself from this prop and then owns
                every field, rather than re-deriving them on each refetch. */}
            {tenant && <ShopProfileForm tenant={tenant} />}
          </>
        )}

        {/* Outside the profile form on purpose: couriers are their own
            endpoints with their own saves, and nesting this section's form
            inside that one would be invalid HTML. It loads independently,
            so it renders even while the tenant is still coming back. */}
        <DeliveryProvidersSection />

        {isOwner && (
          <SettingsSection
            title="Staff"
            description="Who can sign in to this shop, and what each of them may do."
          >
            <Link
              href="/settings/staff"
              className={cn(
                buttonVariants({ variant: "outline" }),
                controls.button,
                "w-fit",
              )}
            >
              Manage staff
              <ArrowRight data-icon="inline-end" className="size-4" />
            </Link>
          </SettingsSection>
        )}
      </div>
    </PageContainer>
  );
}
