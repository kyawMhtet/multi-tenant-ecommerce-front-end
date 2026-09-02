"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { usePlatformLogin } from "@/lib/hooks/usePlatformLogin";
import { setStoredPlatformAdminName, setStoredPlatformToken } from "@/lib/platform-auth";
import { PageContainer } from "@/components/shared/PageContainer";
import { AuthField } from "@/components/shared/AuthField";
import { ErrorState } from "@/components/shared/ErrorState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { typography } from "@/lib/design-tokens";

/**
 * Staff sign-in. Deliberately NOT built on AuthCard: that card is the shop's,
 * down to its wordmark, and two visually identical login screens for two
 * different identities is how someone types shop credentials into the staff
 * console (or worse, the reverse) and files a bug about it.
 *
 * The token goes to setStoredPlatformToken — a different localStorage key
 * entirely. Writing it to the shop's key would sign a shop owner out on this
 * browser and then send a platform token to every shop endpoint, where it
 * 403s. See lib/platform-auth.ts.
 */
export default function PlatformLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = usePlatformLogin();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    login.reset();

    try {
      const result = await login.mutateAsync({ email, password });
      setStoredPlatformToken(result.token);
      setStoredPlatformAdminName(result.admin.name);
      router.push("/platform/billing");
    } catch {
      // Surfaced via error below.
    }
  }

  const error = login.error
    ? login.error instanceof ApiError
      ? login.error.message
      : "Something went wrong. Please try again."
    : null;

  return (
    <div className="flex min-h-screen flex-col justify-center bg-muted/40">
      <PageContainer size="auth">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-foreground text-background">
              <ShieldCheck className="size-6" strokeWidth={2} />
            </div>
            <div className="flex flex-col gap-1.5">
              <h1 className={typography.pageTitle}>Platform console</h1>
              <p className={typography.muted}>
                Staff sign-in. This is not a shop account.
              </p>
            </div>
          </div>

          <Card className="[--card-spacing:--spacing(6)] shadow-sm">
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <AuthField
                  label="Email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <AuthField
                  label="Password"
                  type="password"
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                {/* Rate limited server-side, which arrives as a 429 with no
                    per-field errors — so this stays a single banner rather
                    than trying to map onto a field. */}
                {error && <ErrorState message={error} />}

                <Button type="submit" disabled={login.isPending} className="h-11 w-full">
                  {login.isPending ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </div>
  );
}
