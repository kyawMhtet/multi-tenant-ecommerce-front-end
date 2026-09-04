"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditStaffDialog } from "@/components/admin/EditStaffDialog";
import { RemoveStaffDialog } from "@/components/admin/RemoveStaffDialog";
import { statusPill, typography } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { StaffMember, StaffRoleOption } from "@/lib/types";

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

export function StaffTable({
  members,
  roles,
}: {
  members: StaffMember[];
  roles: StaffRoleOption[];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Added</TableHead>
          <TableHead className="text-right" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.id}>
            <TableCell>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="flex items-center gap-2 truncate font-medium">
                  {member.name}
                  {member.is_you && (
                    <Badge variant="secondary" className={cn(statusPill, "font-medium")}>
                      You
                    </Badge>
                  )}
                </span>
                <span className="truncate text-xs text-muted-foreground">{member.email}</span>
              </div>
            </TableCell>

            <TableCell>{member.role_label}</TableCell>

            <TableCell className={typography.muted}>
              {dateFormatter.format(new Date(member.created_at))}
            </TableCell>

            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                <EditStaffDialog member={member} roles={roles} />
                {member.is_you ? (
                  <span
                    className="px-3 text-sm text-muted-foreground"
                    title="You can't remove your own account. Ask another owner to do it."
                  >
                    —
                  </span>
                ) : (
                  <RemoveStaffDialog member={member} />
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
