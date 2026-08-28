"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { typography } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export interface AuthFieldProps extends React.ComponentProps<"input"> {
  label: string;
  error?: string;
  // Shown only when there's no error — the two would otherwise stack into
  // near-duplicate lines (e.g. "At least 8 characters" above "Password must
  // be at least 8 characters"). The hint comes back once the error clears.
  hint?: React.ReactNode;
}

export function AuthField({ label, error, hint, className, type, ...props }: AuthFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";

  return (
    <Label className="flex flex-col items-stretch gap-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="relative">
        <Input
          type={isPassword && showPassword ? "text" : type}
          // The ui/ primitives are tuned for dense admin screens (h-8 inputs,
          // 14px text at md+) — right for the product table and the POS, wrong
          // for a page holding one short form. Auth is the one place that
          // should breathe, so the height and text size are overridden here
          // rather than in the shadcn primitive, which stays as generated.
          className={cn("h-11 px-3.5 md:text-base", isPassword && "pr-11", className)}
          aria-invalid={error ? true : undefined}
          {...props}
        />
        {isPassword && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            tabIndex={-1}
            className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </Button>
        )}
      </div>
      {error ? (
        <span className="text-sm text-destructive">{error}</span>
      ) : hint ? (
        <span className={typography.muted}>{hint}</span>
      ) : null}
    </Label>
  );
}
