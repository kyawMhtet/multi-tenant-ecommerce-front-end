"use client";

import { Users } from "lucide-react";
import { useRole } from "@/lib/hooks/useRole";
import { useStaff } from "@/lib/hooks/useStaff";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { TableCard } from "@/components/shared/TableCard";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ApiErrorState } from "@/components/shared/ApiErrorState";
import { RoleRequiredNotice } from "@/components/admin/RoleRequiredNotice";
import { StaffTable } from "@/components/admin/StaffTable";
import { StaffSeatMeter } from "@/components/admin/StaffSeatMeter";
import { NewStaffDialog } from "@/components/admin/NewStaffDialog";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function StaffPage() {
  const { isOwner } = useRole();
  const { data, isPending, error } = useStaff({ enabled: isOwner });

  if (!isOwner) {
    return (
      <PageContainer size="lg">
        <div className="flex flex-col gap-6">
          <PageHeader
            title="Staff"
            description="Everyone who can sign in to this shop."
            backHref="/settings"
            backLabel="Back to settings"
          />
          <RoleRequiredNotice minimum="owner" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="lg">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Staff"
          description="Everyone who can sign in to this shop, and what each of them may do."
          backHref="/settings"
          backLabel="Back to settings"
          action={data ? <NewStaffDialog roles={data.meta.roles} /> : undefined}
        />

        <ApiErrorState error={error} fallback="Could not load your staff." />

        {data && <StaffSeatMeter used={data.meta.used} limit={data.meta.limit} />}

        {!error && isPending && (
          <TableCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableSkeleton columns={4} rows={3} />
              </TableBody>
            </Table>
          </TableCard>
        )}

        {data &&
          (data.data.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No one else has a login"
              description="Add the people who work here so they can sign in with their own account."
            />
          ) : (
            <TableCard>
              <StaffTable members={data.data} roles={data.meta.roles} />
            </TableCard>
          ))}
      </div>
    </PageContainer>
  );
}
