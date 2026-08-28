"use client";

import { useEffect, useState } from "react";

// Pure UI utility, no API/React Query dependency — settles to `value` only
// after it's stopped changing for `delayMs`, so a search box can feel
// responsive to type into while only triggering a fetch once the user pauses.
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}
