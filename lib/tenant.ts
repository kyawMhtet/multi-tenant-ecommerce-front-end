// The tenant subdomain pattern for local dev: {slug}.localhost:3000. Modern
// browsers resolve *.localhost to loopback automatically, so no /etc/hosts
// editing is needed to test this. 'admin' and 'www' are reserved aliases
// for the main app, not tenant slugs.
const RESERVED_SUBDOMAINS = new Set(["admin", "www"]);

/**
 * Resolves a tenant slug from a request/browser host string (e.g.
 * "pilotshop.localhost:3000" or "localhost:3000"), or null for the main
 * app domain, which serves (admin).
 *
 * Pure and dependency-free so both proxy.ts (server, parsing the
 * request's Host header) and lib/api-client.ts (browser, reading
 * window.location.host) derive the same slug from the same rule instead
 * of needing to coordinate through a header/cookie.
 */
export function resolveTenantSlug(host: string): string | null {
  const hostname = host.split(":")[0].toLowerCase();

  if (hostname === "localhost" || hostname === "127.0.0.1") return null;

  if (hostname.endsWith(".localhost")) {
    const subdomain = hostname.slice(0, -".localhost".length);
    return RESERVED_SUBDOMAINS.has(subdomain) ? null : subdomain;
  }

  // The production root domain isn't decided yet — extend this branch
  // (e.g. strip a known root-domain suffix) once it is. Until then,
  // anything that isn't the *.localhost dev pattern falls back to admin
  // rather than guessing at a domain shape that doesn't exist.
  return null;
}

/**
 * The inverse of resolveTenantSlug: given the host the admin app is
 * currently served from, builds the host a tenant's storefront would live
 * on. Used by the signup form's live slug preview, so what it shows is
 * derived from the same rule that routes the request rather than a
 * hardcoded domain that can drift out of sync.
 *
 * Deliberately derived from the current host rather than a
 * NEXT_PUBLIC_ROOT_DOMAIN env var, for the same reason as above: the
 * production root domain isn't decided yet. Once it is, this and
 * resolveTenantSlug get updated together.
 */
export function storefrontHost(adminHost: string, slug: string): string {
  const [hostname, port] = adminHost.split(":");
  const labels = hostname.toLowerCase().split(".");

  // Drop the admin app's own subdomain label when it has one, so both
  // localhost:3000 and admin.localhost:3000 preview as
  // {slug}.localhost:3000 rather than {slug}.admin.localhost:3000.
  const root = RESERVED_SUBDOMAINS.has(labels[0]) ? labels.slice(1).join(".") : labels.join(".");

  return port ? `${slug}.${root}:${port}` : `${slug}.${root}`;
}
