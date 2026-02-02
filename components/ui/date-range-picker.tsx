"use client";

import * as React from "react";
import { format, parse } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const DISPLAY_FORMAT = "dd/MM/yyyy";
const API_FORMAT = "yyyy-MM-dd";

function parseApiDate(s: string): Date | undefined {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  return parse(s, API_FORMAT, new Date());
}

function toApiDate(d: Date): string {
  return format(d, API_FORMAT);
}

export type DateRangePickerProps = {
  dateFrom: string;
  dateTo: string;
  onRangeChange: (dateFrom: string, dateTo: string) => void;
  className?: string;
  placeholder?: string;
};

export function DateRangePicker({
  dateFrom,
  dateTo,
  onRangeChange,
  className,
  placeholder = "dd/mm/yyyy",
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const range: DateRange | undefined = React.useMemo(() => {
    const from = parseApiDate(dateFrom);
    const to = parseApiDate(dateTo);
    if (!from && !to) return undefined;
    return { from: from ?? undefined, to: to ?? undefined };
  }, [dateFrom, dateTo]);

  const handleSelect = (r: DateRange | undefined) => {
    const from = r?.from ? toApiDate(r.from) : "";
    const to = r?.to ? toApiDate(r.to) : "";
    onRangeChange(from, to);
  };

  const label = React.useMemo(() => {
    if (!range?.from) return placeholder;
    const fromStr = range.from ? format(range.from, DISPLAY_FORMAT) : placeholder;
    const toStr = range.to ? format(range.to, DISPLAY_FORMAT) : placeholder;
    return `${fromStr} to ${toStr}`;
  }, [range, placeholder]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-8 w-[260px] justify-start text-left font-normal border-muted-foreground/20 text-sm",
            !range?.from && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 size-4 shrink-0" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          defaultMonth={range?.from ?? new Date()}
          selected={range}
          onSelect={handleSelect}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}
