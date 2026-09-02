import { redirect } from "next/navigation";

// The console has one screen today, and /platform is what someone types or
// bookmarks. Without this route the path would fall through to the
// storefront's [slug] catch-all and try to resolve "platform" as a product —
// a literal segment beats a dynamic one, so claiming it here is also what
// keeps that from happening.
export default function PlatformIndexPage() {
  redirect("/platform/billing");
}
