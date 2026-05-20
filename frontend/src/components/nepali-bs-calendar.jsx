"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { getTodayDate, getDaysInMonth, getFirstDayOfMonth } from "bs-ad-calendar-react"

import { createBsSelection, parseDateString } from "@/lib/calendar-sync"

const BS_MONTH_NAMES = [
  "बैशाख",
  "जेठ",
  "असार",
  "श्रावण",
  "भाद्र",
  "आश्विन",
  "कार्तिक",
  "मंसिर",
  "पुष",
  "माघ",
  "फाल्गुन",
  "चैत",
]

const BS_WEEK_DAYS = ["आइत", "सोम", "मंगल", "बुध", "बिही", "शुक्र", "शनि"]
const NEPALI_DIGITS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"]

function toNepaliDigits(value) {
  return String(value).replace(/\d/g, (digit) => NEPALI_DIGITS[Number(digit)])
}

function createBsMonthGrid(today) {
  const year = today.year
  const month = today.month
  const daysInMonth = getDaysInMonth("BS", year, month)
  const firstDayWeekday = getFirstDayOfMonth("BS", year, month)

  const cells = [
    ...Array.from({ length: firstDayWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]

  return {
    bs: { year, month, day: today.day },
    cells,
  }
}

export function NepaliBSCalendar({ selectedDate, onDateSelect }) {
  const today = React.useMemo(() => getTodayDate("BS"), [])
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

  const { bs, cells } = React.useMemo(
    () => createBsMonthGrid({ ...today, year: displayMonth.year, month: displayMonth.month }),
    [displayMonth.month, displayMonth.year, today]
  )

  const selectedParts = React.useMemo(
    () => (selectedDate ? parseDateString(selectedDate) : null),
    [selectedDate]
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

  const holidays = [
    { month: bs.month, date: 1 },
    { month: bs.month, date: 18 },
    { month: bs.month, date: 29 },
  ]

  return (
    <div className="w-72 rounded-2xl border border-slate-800 bg-slate-950 p-3 text-slate-100 shadow-xl shadow-slate-950/30">
      <div className="mb-3 grid grid-cols-[1.5rem_minmax(0,1fr)_1.5rem] items-center gap-2 px-1">
        <button
          type="button"
          onClick={goToPreviousMonth}
          className="inline-flex size-6 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
          aria-label="Previous BS month"
        >
          <ChevronLeftIcon className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={goToCurrentMonth}
          className="min-w-fit text-center text-xs font-semibold text-slate-100"
        >
          {BS_MONTH_NAMES[bs.month]} {toNepaliDigits(bs.year)}
        </button>
        <button
          type="button"
          onClick={goToNextMonth}
          className="inline-flex size-6 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
          aria-label="Next BS month"
        >
          <ChevronRightIcon className="size-3.5" />
        </button>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-2">
        <div className="mb-1 grid grid-cols-7 gap-1 text-center">
          {BS_WEEK_DAYS.map((day) => (
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

            const isToday =
              today.year === bs.year && today.month === bs.month && today.day === cell
            const isSelected =
              selectedParts?.year === bs.year &&
              selectedParts?.month === bs.month &&
              selectedParts?.day === cell
            const holiday = holidays.find(
              (item) => item.month === bs.month && item.date === cell
            )
            const baseClass =
              "flex h-7 w-7 select-none items-center justify-center rounded-md text-xs font-medium transition-colors cursor-pointer"
            const stateClass =
              isToday
                ? "bg-emerald-500 text-white font-semibold"
                : isSelected
                ? "bg-slate-700 text-slate-50 font-semibold"
                : holiday
                ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/20"
                : "text-slate-200 hover:bg-slate-800"

            const dateSelection = createBsSelection(bs.year, bs.month, cell)

            return (
              <button
                key={cell}
                type="button"
                className={`${baseClass} ${stateClass}`}
                aria-label={`BS date ${cell}`}
                onClick={() => onDateSelect?.(dateSelection)}
              >
                {toNepaliDigits(cell)}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
