"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listTimezones } from "@/lib/timezones";
import { cn } from "@/lib/utils";
import { controls } from "@/lib/design-tokens";

interface TimezoneSelectProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  invalid?: boolean;
  disabled?: boolean;
  // The trigger is sized by its caller: signup uses the tall auth control
  // (h-11), settings uses the dense admin default.
  triggerClassName?: string;
}

/**
 * Every IANA zone the browser knows. The list is read in a mount effect
 * rather than during render, because Node's list — and the zone the machine
 * rendering the HTML happens to be in — aren't the visitor's, and a
 * different first client render is a hydration error.
 *
 * The current value is always selectable even before that list arrives, so
 * the control shows the right zone from the first paint and never renders
 * as an empty dropdown.
 */
export function TimezoneSelect({
  value,
  onChange,
  id,
  invalid,
  disabled,
  triggerClassName,
}: TimezoneSelectProps) {
  const [zones, setZones] = useState<string[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setZones(listTimezones());
  }, []);

  const options = useMemo(() => {
    if (zones.length === 0) return value ? [value] : [];
    // A stored zone the browser doesn't list (a deprecated id like
    // "Asia/Rangoon") still has to appear, or opening the picker would
    // silently drop the shop's actual setting.
    return zones.includes(value) ? zones : [value, ...zones].filter(Boolean);
  }, [zones, value]);

  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        if (typeof next === "string" && next) onChange(next);
      }}
    >
      <SelectTrigger
        id={id}
        aria-invalid={invalid ? true : undefined}
        className={cn(controls.select, "w-full", triggerClassName)}
      >
        <SelectValue />
      </SelectTrigger>
      {/* Anchored below the trigger rather than over it: with several
          hundred zones, aligning the popup to the selected item drags it
          most of the way up the viewport. */}
      <SelectContent alignItemWithTrigger={false} className="max-h-80">
        {options.map((zone) => (
          <SelectItem key={zone} value={zone}>
            {zone}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
