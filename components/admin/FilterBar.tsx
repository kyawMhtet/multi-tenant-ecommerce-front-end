import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { controls, surface } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  // The SearchInput, when the screen has one. Given its own slot rather
  // than folded into `children` because it's the only control that grows:
  // it takes the free space on desktop and the full width on mobile, while
  // the selects beside it stay at their intrinsic widths.
  search?: React.ReactNode;
  children?: React.ReactNode;
  // Rendered only when something is actually filtered — an always-visible
  // "Clear" on an unfiltered list is dead chrome that trains people to
  // ignore it.
  onClear?: () => void;
  isFiltered?: boolean;
  // Refetch in flight. Only shown when the bar has no search field of its
  // own; SearchInput already owns that feedback where there is one.
  isFetching?: boolean;
}

/**
 * The toolbar above a list screen's table.
 *
 * Previously each screen laid its filters out as bare controls floating on
 * the page ground, which left the table looking like it started at a random
 * vertical offset. Giving them a surface of their own — same radius and
 * hairline as the table card below — makes the pair read as one unit:
 * controls on top, results underneath.
 */
export function FilterBar({
  search,
  children,
  onClear,
  isFiltered,
  isFetching,
}: FilterBarProps) {
  return (
    // One wrapping row, with the filters as direct flex items rather than
    // nested in a box of their own. Nesting them meant they wrapped inside
    // that box while the bar around it still looked like it had room: the
    // moment "Clear filters" appeared, the last filter dropped to a second
    // line and left a hole beside it.
    <div className={cn(surface.panel, "flex flex-wrap items-center gap-2.5 p-3")}>
      {search && (
        // Takes the whole first row on a phone, then grows into the free
        // space up to max-w-sm. min-w-56 is what lets it give width back:
        // the search shrinks before any filter is pushed onto a new line,
        // which matters because the admin's content column is ~250px
        // narrower than the viewport the lg: breakpoint is measuring.
        <div className="min-w-56 flex-1 basis-full sm:basis-72 sm:max-w-sm">{search}</div>
      )}

      {children}

      {(isFetching || (onClear && isFiltered)) && (
        <div className="ml-auto flex items-center gap-3">
          {isFetching && (
            <Loader2
              className="size-4 shrink-0 animate-spin text-muted-foreground"
              aria-label="Loading results"
            />
          )}
          {onClear && isFiltered && (
            <Button
              type="button"
              variant="ghost"
              onClick={onClear}
              className={cn(controls.buttonSm, "text-muted-foreground")}
            >
              Clear filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
