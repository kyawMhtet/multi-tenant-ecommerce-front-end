"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api-client";
import { useLogin } from "@/lib/hooks/useLogin";
import { setStoredTenantSlug, setStoredToken, setStoredUserName } from "@/lib/auth";
import { ErrorState } from "@/components/shared/ErrorState";
import { AuthCard } from "@/components/admin/AuthCard";
import { AuthField } from "@/components/admin/AuthField";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    login.reset();

    try {
      const result = await login.mutateAsync({ email, password });
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
      title="Welcome back"
      subtitle="Sign in to your admin account"
      footerText="Don't have a shop yet?"
      footerLinkHref="/register"
      footerLinkLabel="Create one"
    >
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

        {error && <ErrorState message={error} />}

        <Button type="submit" disabled={login.isPending} className="h-11 w-full">
          {login.isPending ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </AuthCard>
  );
}
