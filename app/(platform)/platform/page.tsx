import { redirect } from "next/navigation";

// /platform is what someone types or bookmarks. Without this route the path
// would fall through to the storefront's [slug] catch-all and try to resolve
// "platform" as a product — a literal segment beats a dynamic one, so claiming
// it here is also what keeps that from happening.
//
// It lands on the shop directory rather than the payment queue. The queue was
// the whole console once; now it's one job among four, and everything else is
// reached through a shop — a screen that can hand you an id is the only sane
// home. The queue is one click away in the nav, which is where someone who
// came here to settle transfers looks anyway.
export default function PlatformIndexPage() {
  redirect("/platform/shops");
}
