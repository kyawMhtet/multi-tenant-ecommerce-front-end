---
name: scaffold-admin-page
description: Scaffold a new admin CRUD screen (list, create, edit pages) following the pattern established by the products screens — lib/api + lib/hooks layering, client-side validation matching Laravel Form Requests. Use when adding a new admin-side resource screen.
argument-hint: [resource-name] [api-endpoint-path]
---

Scaffold admin screens for $ARGUMENTS, following the pattern in
app/(admin)/products/ as the reference.

Before writing code, confirm with me:
1. The shape of the API resource this screen manages (fields, which
   are required)
2. Whether it needs the same "simple by default, reveal complexity on
   demand" pattern products used for variants, or if it's a flat
   single-entity form

Then create, following the layering in CLAUDE.md (components/pages
call lib/hooks/*.ts, hooks call lib/api/*.ts, only lib/api/*.ts calls
apiFetch from lib/api-client.ts — no layer skips ahead):
1. lib/api/[resource].ts — pure typed functions (get/create/update)
   wrapping apiFetch
2. lib/hooks/use[Resource]s.ts, use[Resource].ts (queries), and
   useCreate[Resource].ts / useUpdate[Resource].ts (mutations that
   invalidate the list query key on success)
3. [resource]/page.tsx — list view, using the query hook
4. [resource]/new/page.tsx — create form with client-side validation,
   using the create mutation hook
5. [resource]/[id]/page.tsx — edit form, same validation rules, using
   the detail query + update mutation hooks
6. Add/update the relevant types in lib/types.ts

Confirm the list, create, and edit flow all work end to end before
considering the task done.

After creating all three, tell me to restart Claude Code so it picks
up the new .claude/agents/ and .claude/skills/ directories.
