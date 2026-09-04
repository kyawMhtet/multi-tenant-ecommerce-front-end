import Link from "next/link";
import { PageContainer } from "@/components/shared/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { typography } from "@/lib/design-tokens";

interface AuthCardProps {
  title: string;
  subtitle: string;
  // The form itself. Everything around it — mark, heading, footer link — is
  // identical between sign-in and sign-up, so it lives here once instead of
  // being kept in sync across two pages by hand.
  children: React.ReactNode;
  footerText: string;
  footerLinkHref: string;
  footerLinkLabel: string;
  // "auth" (max-w-md) is the width a stack of single-column fields wants, and
  // the default for that reason. Signup opts into "md" because it carries a
  // side-by-side row (currency + timezone): at the auth width those two split
  // ~400px between them, which truncates "MMK — Myanmar Kyat" and every
  // timezone label. Widening the container is the fix rather than stacking
  // them, since the pair genuinely belongs on one line.
  size?: "auth" | "md";
}

export function AuthCard({
  title,
  subtitle,
  children,
  footerText,
  footerLinkHref,
  footerLinkLabel,
  size = "auth",
}: AuthCardProps) {
  return (
    <div className="flex min-h-screen flex-col justify-center bg-muted/40">
      <PageContainer size={size}>
        <div className="flex flex-col gap-6">
          {/* Heading sits above the card, not inside it, so the card reads
              as just the form — fewer nested boxes for the eye to unpack. */}
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground">
              S
            </div>
            <div className="flex flex-col gap-1.5">
              <h1 className={typography.pageTitle}>{title}</h1>
              <p className={typography.muted}>{subtitle}</p>
            </div>
          </div>

          {/* Card's padding is driven by a --card-spacing var; widening it
              here beats adding padding utilities that fight the primitive. */}
          <Card className="[--card-spacing:--spacing(6)] shadow-sm">
            <CardContent>{children}</CardContent>
          </Card>

          <p className={`text-center ${typography.muted}`}>
            {footerText}{" "}
            <Link
              href={footerLinkHref}
              className="font-medium text-primary hover:underline"
            >
              {footerLinkLabel}
            </Link>
          </p>
        </div>
      </PageContainer>
    </div>
  );
}
