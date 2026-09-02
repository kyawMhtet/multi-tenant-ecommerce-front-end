"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { usePlatformAdmins } from "@/lib/hooks/usePlatformAdmins";
import { usePlatformMe } from "@/lib/hooks/usePlatformMe";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { TableCard } from "@/components/shared/TableCard";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { TablePagination } from "@/components/shared/TablePagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { ApiErrorState } from "@/components/shared/ApiErrorState";
import { NewPlatformAdminDialog } from "@/components/platform/NewPlatformAdminDialog";
import { PlatformAdminActions } from "@/components/platform/PlatformAdminActions";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBillingDate } from "@/lib/billing";
import { staffStatusClassName, statusPill, typography } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const COLUMNS = ["Name", "Email", "Status", "Last signed in", "Added", ""] as const;

function AdminTableHead() {
  return (
    <TableHeader>
      <TableRow>
        {COLUMNS.map((column, i) => (
          <TableHead
            key={column || i}
            className={i === COLUMNS.length - 1 ? "text-right" : undefined}
          >
            {column}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}

/**
 * Platform staff — the people who can read every shop and settle money on any
 * of them.
 *
 * Two things this screen has to be honest about, both of them in the copy
 * rather than in the mechanics:
 *
 *   - Deactivation is not deletion. The row and its tokens are kept, it takes
 *     effect on the deactivated admin's very next request, and reactivating
 *     restores the account without a fresh sign-in.
 *   - You cannot deactivate yourself. The API refuses it (422, reason
 *     "billing_action_unavailable") because the last active admin doing so
 *     would lock every human out of the payment queue. This screen disables
 *     the button on your own row, matched by id against usePlatformMe — that
 *     is courtesy so nobody discovers the rule by clicking; the server check
 *     is the guard.
 */
export default function PlatformAdminsPage() {
  const [page, setPage] = useState(1);
  const { data, isPending, error } = usePlatformAdmins(page);
  // Already in cache — the (platform) layout gates on it — so this is a read,
  // not a second request.
  const me = usePlatformMe();

  const admins = data?.data;
  const meta = data?.meta;

  return (
    <PageContainer size="lg">
      <div className="flex flex-col gap-5">
        <PageHeader
          title="Staff"
          eyebrow="Platform console"
          description="Accounts that can review payments and read every shop on the platform."
          action={<NewPlatformAdminDialog />}
        />

        <ApiErrorState error={error} fallback="Could not load the staff list." />

        {!error && isPending && (
          <TableCard>
            <Table>
              <AdminTableHead />
              <TableBody>
                <TableSkeleton columns={COLUMNS.length} rows={3} />
              </TableBody>
            </Table>
          </TableCard>
        )}

        {admins && admins.length === 0 && (
          // Unreachable in practice — you are signed in, so at least one exists
          // — but the list is paginated and a page past the end is empty.
          <EmptyState
            icon={Users}
            title="No admins on this page"
            description="Try going back to the first page."
          />
        )}

        {admins && admins.length > 0 && meta && (
          <TableCard
            footer={
              <TablePagination
                meta={meta}
                page={page}
                onPageChange={setPage}
                label="admins"
              />
            }
          >
            <Table>
              <AdminTableHead />
              <TableBody>
                {admins.map((admin) => {
                  const isSelf = me.data?.id === admin.id;

                  return (
                    <TableRow key={admin.id} className={cn(!admin.is_active && "opacity-60")}>
                      <TableCell className="font-medium">{admin.name}</TableCell>

                      <TableCell className={typography.muted}>{admin.email}</TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            statusPill,
                            staffStatusClassName[admin.is_active ? "active" : "inactive"],
                          )}
                        >
                          {admin.is_active ? "Active" : "Deactivated"}
                        </Badge>
                      </TableCell>

                      <TableCell className={cn(typography.muted, "whitespace-nowrap")}>
                        {/* Null for an account that has never signed in — which
                            is worth seeing on a list of people who can settle
                            money. */}
                        {formatBillingDate(admin.last_login_at) ?? "Never"}
                      </TableCell>

                      <TableCell className={cn(typography.muted, "whitespace-nowrap")}>
                        {formatBillingDate(admin.created_at) ?? "—"}
                      </TableCell>

                      <TableCell className="text-right">
                        <PlatformAdminActions admin={admin} isSelf={isSelf} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableCard>
        )}

        <p className={cn(typography.muted, "text-balance")}>
          Deactivating an account isn&apos;t deleting it: their name stays on every payment
          they approved, their access stops on their very next request, and reactivating
          gives it back without a new sign-in.
        </p>
      </div>
    </PageContainer>
  );
}
