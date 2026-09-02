import { Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { controls } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
  // Server round-trip in flight for the current term. The spinner takes the
  // trailing slot while it's true — search is debounced, so without it a
  // typed term looks like it did nothing for ~400ms.
  isFetching?: boolean;
  className?: string;
}

/**
 * The list screens' search field — admin and platform console alike (which is
 * why it lives in shared/; see FilterBar).
 *
 * A bare <Input> is 32px tall with a 4px inset — fine for a form row, far
 * too slight for the control a list screen is driven by. This is the one
 * place the admin's search gets its size (controls.search: 44px, gutters
 * reserved on both sides), its magnifier, and a clear affordance, so
 * products/POS/anything later can't drift apart.
 *
 * type="search" is deliberate — it gets the Escape-to-clear behaviour for
 * free — but WebKit's native clear button is suppressed below, since it
 * lands in the same gutter as ours and can't be styled to match.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  label,
  isFetching,
  className,
}: SearchInputProps) {
  return (
    <div className={cn("relative w-full", className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          controls.search,
          "bg-card [&::-webkit-search-cancel-button]:appearance-none",
        )}
      />

      {/* One trailing slot, not two: the spinner is transient (it only
          shows between a settled keystroke and the response landing), and
          stacking it beside the clear button in a 40px gutter would crowd
          both. */}
      {isFetching ? (
        <Loader2
          className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
          aria-label="Searching"
        />
      ) : (
        value !== "" && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-2.5 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <X className="size-3.5" />
          </button>
        )
      )}
    </div>
  );
}
