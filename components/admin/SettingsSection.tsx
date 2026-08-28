import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { typography } from "@/lib/design-tokens";

// The settings screen is four independent groups of fields inside one form.
// Each gets the same card + heading + description shell so the page body
// stays a list of sections rather than four hand-rolled card layouts.
interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className={typography.sectionHeading}>{title}</CardTitle>
        {description && (
          <CardDescription className={typography.muted}>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  );
}
