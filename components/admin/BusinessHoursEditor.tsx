"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DAY_LABELS } from "@/lib/shop-profile";
import { controls, typography } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import {
  BUSINESS_HOURS_DAYS,
  type BusinessHours,
  type BusinessHoursDay,
  type BusinessHoursInterval,
} from "@/lib/types";

/**
 * Keyed either by a day ("mon") for a whole-day problem, or by
 * "day.index" ("mon.1") for one interval — which is what Laravel's 422 keys
 * collapse to (business_hours.mon.1.close → "mon.1"), so server and
 * client-side messages land in the same place with no second shape.
 */
export type BusinessHoursErrors = Record<string, string>;

// 'business_hours.*' => ['array', 'list', 'max:2'] — one shift plus an
// optional split shift, and the backend rejects a third.
export const MAX_INTERVALS_PER_DAY = 2;

const DEFAULT_INTERVAL: BusinessHoursInterval = { open: "09:00", close: "17:00" };

/**
 * A sensible second row: a shop adding a split shift is almost always
 * breaking one long day in two, so it starts where the previous one ends.
 * Clamped so the row it generates always satisfies close > open (the one
 * rule that can't be expressed in the field markup) — no default that's
 * invalid the moment it appears.
 *
 * "HH:MM" is zero-padded 24-hour, so plain string comparison is
 * chronological here and everywhere else in this file.
 */
function nextInterval(previous: BusinessHoursInterval): BusinessHoursInterval {
  const open = previous.close >= "23:00" ? "23:00" : previous.close;
  return { open, close: open >= "17:00" ? "23:59" : "17:00" };
}

interface BusinessHoursEditorProps {
  value: BusinessHours;
  onChange: (value: BusinessHours) => void;
  errors?: BusinessHoursErrors;
}

export function BusinessHoursEditor({ value, onChange, errors = {} }: BusinessHoursEditorProps) {
  function setDay(day: BusinessHoursDay, intervals: BusinessHoursInterval[]) {
    onChange({ ...value, [day]: intervals });
  }

  // A closed day is an empty list — there is no `closed: true` flag, so the
  // checkbox is just "does this day have any intervals".
  function toggleDay(day: BusinessHoursDay, isOpen: boolean) {
    setDay(day, isOpen ? [DEFAULT_INTERVAL] : []);
  }

  function updateInterval(
    day: BusinessHoursDay,
    index: number,
    patch: Partial<BusinessHoursInterval>,
  ) {
    setDay(
      day,
      value[day].map((interval, i) => (i === index ? { ...interval, ...patch } : interval)),
    );
  }

  function addInterval(day: BusinessHoursDay) {
    const intervals = value[day];
    const previous = intervals[intervals.length - 1];
    setDay(day, [...intervals, previous ? nextInterval(previous) : DEFAULT_INTERVAL]);
  }

  function removeInterval(day: BusinessHoursDay, index: number) {
    setDay(
      day,
      value[day].filter((_, i) => i !== index),
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {BUSINESS_HOURS_DAYS.map((day) => {
        const intervals = value[day];
        const isOpen = intervals.length > 0;
        const dayLabel = DAY_LABELS[day];
        const dayError = errors[day];

        return (
          <div
            key={day}
            className="flex flex-col gap-2 border-b pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-start sm:gap-4"
          >
            <Label className="w-32 shrink-0 gap-1.5 pt-1.5 text-sm font-normal">
              <Checkbox
                checked={isOpen}
                onCheckedChange={(checked) => toggleDay(day, checked === true)}
              />
              {dayLabel}
            </Label>

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              {!isOpen && <span className={cn(typography.muted, "pt-1.5")}>Closed</span>}

              {intervals.map((interval, index) => {
                const intervalError = errors[`${day}.${index}`];
                const position = index === 0 ? "shift" : "split shift";

                return (
                  // Index keys are safe here: rows are capped at 2, always
                  // rendered in order, and only ever appended/removed as a
                  // whole — there is no reordering to confuse React with.
                  <div key={index} className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        type="time"
                        className={cn(controls.input, "w-32")}
                        aria-label={`${dayLabel} ${position} opening time`}
                        value={interval.open}
                        onChange={(e) => updateInterval(day, index, { open: e.target.value })}
                      />
                      <span className={typography.muted}>to</span>
                      <Input
                        type="time"
                        className={cn(controls.input, "w-32")}
                        aria-label={`${dayLabel} ${position} closing time`}
                        value={interval.close}
                        onChange={(e) => updateInterval(day, index, { close: e.target.value })}
                      />
                      {intervals.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${dayLabel} ${position}`}
                          onClick={() => removeInterval(day, index)}
                        >
                          <X />
                        </Button>
                      )}
                    </div>
                    {intervalError && (
                      <span className="text-sm text-destructive">{intervalError}</span>
                    )}
                  </div>
                );
              })}

              {isOpen && intervals.length < MAX_INTERVALS_PER_DAY && (
                <Button
                  type="button"
                  variant="ghost"
                  className={cn(controls.buttonSm, "w-fit")}
                  onClick={() => addInterval(day)}
                >
                  <Plus />
                  Add split shift
                </Button>
              )}

              {dayError && <span className="text-sm text-destructive">{dayError}</span>}
            </div>
          </div>
        );
      })}

      <p className="text-xs text-muted-foreground">
        Times are 24-hour. Overnight hours aren&apos;t supported — a shop open past midnight
        closes at 23:59.
      </p>
    </div>
  );
}
