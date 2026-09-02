"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { useLogin } from "@/lib/hooks/useLogin";
import { setStoredTenantSlug, setStoredToken, setStoredUserName } from "@/lib/auth";
import { ErrorState } from "@/components/shared/ErrorState";
import { AuthCard } from "@/components/admin/AuthCard";
import { AuthField } from "@/components/shared/AuthField";
import { Button } from "@/components/ui/button";
import { notice, noticeTone } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

interface LoginScreenProps {
  // Arrived here straight from signup. The shop exists; all that's left is
  // authenticating with the password they just chose.
  justRegistered: boolean;
  prefillEmail: string;
}

function LoginScreen({ justRegistered, prefillEmail }: LoginScreenProps) {
  const router = useRouter();
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState("");
  const login = useLogin();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    login.reset();

    try {
      const result = await login.mutateAsync({ email, password });
      // The only place in the app that writes these three. Registration
      // deliberately writes none of them, because it never receives a token.
      setStoredToken(result.token);
      setStoredUserName(result.data.name);
      if (result.data.tenant_slug) {
        setStoredTenantSlug(result.data.tenant_slug);
      }
      router.push("/dashboard");
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
    <AuthCard
      title={justRegistered ? "Almost there" : "Welcome back"}
      subtitle={
        justRegistered
          ? "Sign in with the password you just chose"
          : "Sign in to your admin account"
      }
      footerText="Don't have a shop yet?"
      footerLinkHref="/register"
      footerLinkLabel="Create one"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Phrased as a step completed, not an obstacle. Landing on a bare
            login form straight after signing up reads as though the signup
            failed — this is the only thing that says it didn't. */}
        {justRegistered && (
          <div className={cn(notice, noticeTone.accent)} role="status">
            <CheckCircle2
              className="mt-0.5 size-4.5 shrink-0"
              strokeWidth={2}
              aria-hidden="true"
            />
            <p className="text-pretty">
              <span className="font-semibold">Shop created.</span> Sign in to continue.
            </p>
          </div>
        )}

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
          // Straight after signup the password is the only thing being asked
          // for, so it takes focus and the prefilled email is left alone.
          autoFocus={justRegistered}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <ErrorState message={error} />}

        <Button type="submit" disabled={login.isPending} className="h-11 w-full">
          {login.isPending ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </AuthCard>
  );
}

function LoginScreenFromQuery() {
  const params = useSearchParams();

  return (
    <LoginScreen
      justRegistered={params.get("registered") === "1"}
      prefillEmail={params.get("email") ?? ""}
    />
  );
}

/**
 * Reading the query string forces the tree beneath the nearest Suspense
 * boundary to be client-rendered (see the Next docs on useSearchParams and
 * prerendering), so the boundary's fallback is the SAME screen without the
 * signup handoff rather than null. A null fallback would prerender a blank
 * card and flash the whole form in on hydration; this way the login form is
 * in the initial HTML and usable, and the prefill plus the notice arrive with
 * it a moment later.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginScreen justRegistered={false} prefillEmail="" />}>
      <LoginScreenFromQuery />
    </Suspense>
  );
}
