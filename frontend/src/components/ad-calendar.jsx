"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { createAdSelection, parseDateString } from "@/lib/calendar-sync"

const AD_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
]

const AD_WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

function createAdMonthGrid(referenceDate) {
  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const firstDayWeekday = firstDay.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = [
    ...Array.from({ length: firstDayWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]

  return {
    year,
    month,
    daysInMonth,
    cells,
  }
}

export function AdCalendar({ selectedDate, onDateSelect }) {
  const today = React.useMemo(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth(), date: d.getDate() }
  }, [])
  const [displayMonth, setDisplayMonth] = React.useState(() => ({
    year: selectedDate ? parseDateString(selectedDate).year : today.year,
    month: selectedDate ? parseDateString(selectedDate).month : today.month,
  }))

  React.useEffect(() => {
    if (selectedDate) {
      const parsed = parseDateString(selectedDate)
      if (Number.isFinite(parsed.year) && Number.isFinite(parsed.month)) {
        setDisplayMonth({ year: parsed.year, month: parsed.month })
      }
    } else {
      setDisplayMonth({ year: today.year, month: today.month })
    }
  }, [selectedDate, today.year, today.month])

  const { year, month, cells } = React.useMemo(
    () => createAdMonthGrid(new Date(displayMonth.year, displayMonth.month, 1)),
    [displayMonth]
  )

  const goToPreviousMonth = React.useCallback(() => {
    setDisplayMonth((current) => {
      if (current.month === 0) {
        return { year: current.year - 1, month: 11 }
      }

      return { year: current.year, month: current.month - 1 }
    })
  }, [])

  const goToNextMonth = React.useCallback(() => {
    setDisplayMonth((current) => {
      if (current.month === 11) {
        return { year: current.year + 1, month: 0 }
      }

      return { year: current.year, month: current.month + 1 }
    })
  }, [])

  const goToCurrentMonth = React.useCallback(() => {
    setDisplayMonth({ year: today.year, month: today.month })
  }, [today.month, today.year])

  const selectedParts = React.useMemo(
    () => (selectedDate ? parseDateString(selectedDate) : null),
    [selectedDate]
  )

  return (
    <div className="w-72 rounded-2xl border border-slate-800 bg-slate-950 p-3 text-slate-100 shadow-xl shadow-slate-950/30">
      <div className="mb-3 grid grid-cols-[1.5rem_minmax(0,1fr)_1.5rem] items-center gap-2 px-1">
        <button
          type="button"
          onClick={goToPreviousMonth}
          className="inline-flex size-6 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
          aria-label="Previous month"
        >
          <ChevronLeftIcon className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={goToCurrentMonth}
          className="min-w-fit text-center text-xs font-semibold text-slate-100"
        >
          {AD_MONTH_NAMES[month]} {year}
        </button>
        <button
          type="button"
          onClick={goToNextMonth}
          className="inline-flex size-6 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
          aria-label="Next month"
        >
          <ChevronRightIcon className="size-3.5" />
        </button>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-2">
        <div className="mb-1 grid grid-cols-7 gap-1 text-center">
          {AD_WEEK_DAYS.map((day) => (
            <div key={day} className="flex h-6 w-7 items-center justify-center text-[0.65rem] font-medium text-slate-400">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, index) => {
            if (cell === null) {
              return <div key={`empty-${index}`} className="h-7 w-7" />
            }

            const isToday = today.year === year && today.month === month && today.date === cell
            const isSelected =
              selectedParts?.year === year &&
              selectedParts?.month === month &&
              selectedParts?.day === cell

            const baseClass =
              "flex h-7 w-7 select-none items-center justify-center rounded-md text-xs font-medium transition-colors cursor-pointer"
            const stateClass =
              isToday
                ? "bg-emerald-500 text-white font-semibold"
                : isSelected
                ? "bg-slate-700 text-slate-50 font-semibold"
                : "text-slate-200 hover:bg-slate-800"

            const dateSelection = createAdSelection(year, month, cell)

            return (
              <button
                key={cell}
                type="button"
                className={`${baseClass} ${stateClass}`}
                aria-label={`AD date ${cell}`}
                onClick={() => onDateSelect?.(dateSelection)}
              >
                {cell}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
