"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AdCalendar } from '@/components/ad-calendar';
import { NepaliBSCalendar } from '@/components/nepali-bs-calendar';
import { getDateFormatPreference, setDateFormatPreference } from '@/hooks/use-date-format';
import { createDateSelection, getInitialCalendarSelection } from '@/lib/calendar-sync';
import { cn } from '@/lib/utils';

function selectionFromDate(dateValue, format) {
  if (!dateValue) return getInitialCalendarSelection();
  return createDateSelection(dateValue, format);
}

function currentValue(selection, dateFormat) {
  return selection[dateFormat];
}

function DateField({ label, placeholder, selection, dateFormat, onSelectionChange }) {
  const [open, setOpen] = useState(false);
  const value = selection[dateFormat];
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        className={cn(
          buttonVariants({ variant: 'outline' }),
          'w-full justify-between gap-3 rounded-xl border-slate-700 bg-slate-950 px-3 text-left text-sm font-normal text-slate-100 shadow-sm transition-all hover:border-emerald-500 hover:bg-slate-900',
          !value && 'text-slate-400'
        )}
      >
        <span className="truncate py-2 text-sm font-medium leading-none text-slate-100">{value || placeholder}</span>
        <CalendarIcon className="size-4 shrink-0 text-slate-400" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 rounded-2xl border border-slate-800 bg-slate-950 p-2 text-slate-100 shadow-xl shadow-slate-950/30">
        {dateFormat === 'ad' ? (
          <AdCalendar
            selectedDate={selection.ad}
            onDateSelect={(nextSelection) => {
              onSelectionChange(nextSelection);
              setOpen(false);
            }}
          />
        ) : (
          <NepaliBSCalendar
            selectedDate={selection.bs}
            onDateSelect={(nextSelection) => {
              onSelectionChange(nextSelection);
              setOpen(false);
            }}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

export function AttendanceDateFilter({
  mode = 'range',
  title = 'Attendance Date Filter',
  description = 'Switch between AD and BS and pick the calendar that matches your preference.',
  initialDateFormat,
  initialDateSourceFormat = 'ad',
  initialDate,
  initialStartDate,
  initialEndDate,
  applyLabel = 'Apply Filter',
  onApply,
}) {
  const defaultFormat = initialDateFormat ?? getDateFormatPreference();
  const [dateFormat, setDateFormat] = useState(defaultFormat);
  const [singleSelection, setSingleSelection] = useState(() => selectionFromDate(initialDate, defaultFormat));
  const [startSelection, setStartSelection] = useState(() => selectionFromDate(initialStartDate, defaultFormat));
  const [endSelection, setEndSelection] = useState(() => selectionFromDate(initialEndDate, defaultFormat));

  useEffect(() => {
    console.debug('[attendance-date-filter] init', {
      mode,
      defaultFormat,
      initialDateFormat,
      initialDate,
      initialStartDate,
      initialEndDate,
    });
  }, [defaultFormat, initialDate, initialDateFormat, initialEndDate, initialStartDate, mode]);

  useEffect(() => {
    if (initialDateFormat) {
      console.debug('[attendance-date-filter] sync-format-from-props', { initialDateFormat });
      setDateFormat(initialDateFormat);
    }
  }, [initialDateFormat]);

  const isSingle = mode === 'single';

  useEffect(() => {
    if (isSingle) {
      setSingleSelection(selectionFromDate(initialDate, initialDateSourceFormat));
      return;
    }

    setStartSelection(selectionFromDate(initialStartDate, initialDateSourceFormat));
    setEndSelection(selectionFromDate(initialEndDate, initialDateSourceFormat));
  }, [initialDate, initialDateSourceFormat, initialEndDate, initialStartDate, isSingle]);

  const handleFormatChange = (nextFormat) => {
    console.debug('[attendance-date-filter] format-change', { from: dateFormat, to: nextFormat });
    setDateFormat(nextFormat);
    setDateFormatPreference(nextFormat);
  };

  const appliedLabel = useMemo(() => {
    if (isSingle) {
      return currentValue(singleSelection, dateFormat);
    }

    return `${currentValue(startSelection, dateFormat)} → ${currentValue(endSelection, dateFormat)}`;
  }, [dateFormat, endSelection, isSingle, singleSelection, startSelection]);

  const handleApply = () => {
    if (isSingle) {
      const value = currentValue(singleSelection, dateFormat);
      onApply({
        dateFormat,
        startDate: value,
        endDate: value,
      });
      return;
    }

    onApply({
      dateFormat,
      startDate: currentValue(startSelection, dateFormat),
      endDate: currentValue(endSelection, dateFormat),
    });
  };

  return (
    <Card className="w-full rounded-2xl border-slate-800 bg-slate-900/80 text-slate-100 shadow-lg shadow-slate-950/20">
      <CardContent className="pt-4">
        <div className="flex flex-col gap-4">
          <div className={cn('flex gap-4 flex-wrap', isSingle ? 'flex-col' : '')}>
            {!isSingle && (
              <>
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Start Date</span>
                  <DateField
                    label="Start Date"
                    placeholder="Select start"
                    selection={startSelection}
                    dateFormat={dateFormat}
                    onSelectionChange={setStartSelection}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">End Date</span>
                  <DateField
                    label="End Date"
                    placeholder="Select end"
                    selection={endSelection}
                    dateFormat={dateFormat}
                    onSelectionChange={setEndSelection}
                  />
                </div>
              </>
            )}

            {isSingle && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Date</span>
                <DateField
                  label="Date"
                  placeholder="Select date"
                  selection={singleSelection}
                  dateFormat={dateFormat}
                  onSelectionChange={setSingleSelection}
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <Button type="button" onClick={handleApply} className="h-9 rounded-full bg-emerald-600 px-5 font-medium text-white hover:bg-emerald-700">
              {applyLabel}
            </Button>
            <div className="inline-flex w-fit rounded-full border border-slate-800 bg-slate-950 p-1 shadow-sm">
              <Button
                type="button"
                size="sm"
                variant={dateFormat === 'ad' ? 'default' : 'ghost'}
                onClick={() => handleFormatChange('ad')}
                className={cn('h-8 rounded-full px-3 text-xs font-medium', dateFormat !== 'ad' && 'text-slate-400')}
              >
                AD
              </Button>
              <Button
                type="button"
                size="sm"
                variant={dateFormat === 'bs' ? 'default' : 'ghost'}
                onClick={() => handleFormatChange('bs')}
                className={cn('h-8 rounded-full px-3 text-xs font-medium', dateFormat !== 'bs' && 'text-slate-400')}
              >
                BS
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default AttendanceDateFilter;
