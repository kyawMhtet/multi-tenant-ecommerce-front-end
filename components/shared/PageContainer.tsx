import { cn } from "@/lib/utils";

const SIZES = {
  sm: "max-w-sm",
  // Sits between sm and md deliberately: a centered auth card wants ~28rem,
  // and the t-shirt scale jumps straight from 24rem to 42rem with nothing
  // in between. Named for its use rather than squeezed into the scale so
  // it's obvious this is the login/signup width, and so the auth screens
  // still get their max-width from here rather than defining one ad hoc.
  auth: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  // Storefront catalogue width — wider than lg so a 4-up product grid has
  // room to breathe, but still capped so it doesn't sprawl on a large
  // monitor the way "full" does.
  wide: "max-w-7xl",
  full: "max-w-none",
} as const;

interface PageContainerProps {
  size?: keyof typeof SIZES;
  className?: string;
  children: React.ReactNode;
}

export function PageContainer({ size = "lg", className, children }: PageContainerProps) {
  return (
    <div className={cn("mx-auto w-full px-4 py-6 sm:px-8 sm:py-8", SIZES[size], className)}>
      {children}
    </div>
  );
}
