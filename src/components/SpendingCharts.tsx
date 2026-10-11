import { useMemo, useState } from 'react'
import { cn } from '../lib/cn'
import { shiftMonth, todayIso, useFormat } from '../lib/format'
import { addDays } from '../lib/period'
import { isTransfer } from '../lib/transfers'
import { effectiveMonth, isAssignedAway } from '../lib/range'
import type { Transaction } from '../lib/types'
import { useI18n } from '../locales'
import type { MessageKey } from '../locales/en'
import { Card } from './ui'

type View = 'weekday' | 'week' | 'month'
const VIEWS: [View, MessageKey][] = [
  ['weekday', 'chart.weekday'],
  ['week', 'chart.week'],
  ['month', 'chart.month'],
]
const WEEKDAYS = ['weekday.1', 'weekday.2', 'weekday.3', 'weekday.4', 'weekday.5', 'weekday.6', 'weekday.7'] as const

type Series = 'expense' | 'income'
const SERIES: Series[] = ['expense', 'income']
const STYLE: Record<Series, { text: string; bg: string }> = {
  expense: { text: 'text-expense', bg: 'bg-expense' },
  income: { text: 'text-income', bg: 'bg-income' },
}

interface Bar {
  key: string
  short: string
  label: string
  expense: number
  income: number
  current?: boolean
}

const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
const dayIndex = (iso: string) => (new Date(`${iso}T00:00:00`).getDay() + 6) % 7
const mondayOf = (iso: string) => addDays(iso, -dayIndex(iso))
const lastDay = (month: string) => new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()

/**
 * Expense and income lines for the days of one week (Mon–Sun), the weeks of a month, or the last
 * 12 months. Days and weeks use the transaction date (leaving out entries booked for another month); months use the month an entry is *for*.
 */
export function SpendingCharts({ all, anchor, loading }: { all: Transaction[]; anchor: string; loading: boolean }) {
  const { t, locale } = useI18n()
  const { formatShortVnd, formatVnd, formatMonth, formatMonthShort } = useFormat()
  const today = todayIso()
  const [view, setView] = useState<View>('weekday')
  // Everything is anchored to the page period: its week, its month, or the 12 months ending with it.
  const month = anchor.slice(0, 7)
  const monday = mondayOf(anchor)

  const totals = useMemo(() => {
    const day = { expense: new Map<string, number>(), income: new Map<string, number>() }
    const mon = { expense: new Map<string, number>(), income: new Map<string, number>() } // by the month it is for
    for (const x of all) {
      if (isTransfer(x)) continue // savings / investments are not spending
      // Entries booked for another month are in the month totals only, not on the day / week lines.
      if (!isAssignedAway(x)) day[x.type].set(x.date, (day[x.type].get(x.date) ?? 0) + x.amount)
      const m = effectiveMonth(x)
      mon[x.type].set(m, (mon[x.type].get(m) ?? 0) + x.amount)
    }
    return { day, mon }
  }, [all])

  const bars = useMemo<Bar[]>(() => {
    const range = (type: Series, from: string, to: string) => {
      let s = 0
      for (const [d, v] of totals.day[type]) if (d >= from && d <= to) s += v
      return s
    }
    if (view === 'weekday') {
      return WEEKDAYS.map((key, i) => {
        const w = t(key)
        const d = addDays(monday, i)
        return { key: d, short: w, label: `${w} · ${dm(d)}`, expense: totals.day.expense.get(d) ?? 0, income: totals.day.income.get(d) ?? 0, current: d === today }
      })
    }
    if (view === 'week') {
      const first = `${month}-01`
      const last = `${month}-${String(lastDay(month)).padStart(2, '0')}`
      const out: Bar[] = []
      for (let m = mondayOf(first); m <= last; m = addDays(m, 7)) {
        const from = m < first ? first : m
        const end = addDays(m, 6)
        const to = end > last ? last : end
        const span = `${dm(from)}–${dm(to)}`
        out.push({ key: m, short: span, label: span, expense: range('expense', from, to), income: range('income', from, to), current: today >= from && today <= to })
      }
      return out
    }
    return Array.from({ length: 12 }, (_, i) => {
      const m = shiftMonth(month, i - 11)
      return { key: m, short: formatMonthShort(m), label: formatMonth(m), expense: totals.mon.expense.get(m) ?? 0, income: totals.mon.income.get(m) ?? 0, current: m === month }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, monday, month, totals, today, locale])

  // Income is only meaningful per month (it can be booked for another month); days and weeks show spending only.
  const series: Series[] = view === 'month' ? SERIES : ['expense']
  const max = Math.max(1, ...bars.flatMap((b) => series.map((s) => b[s])))
  const sum = (type: Series) => bars.reduce((s, b) => s + b[type], 0)
  const spendingBars = bars.filter((b) => b.expense > 0).length
  const avg = spendingBars ? Math.round(sum('expense') / spendingBars) : 0
  const pathOf = (type: Series) => bars.map((b, i) => `${i ? 'L' : 'M'}${(i + 0.5) * 100} ${100 - (b[type] / max) * 100}`).join(' ')
  const expenseLine = pathOf('expense')

  return (
    <Card
      className="flex flex-col lg:min-h-0"
      title={t('chart.title')}
      action={
        <div role="tablist" aria-label={t('chart.kind')} className="flex rounded-lg border border-border bg-surface-2 p-0.5">
          {VIEWS.map(([id, labelKey]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => setView(id)}
              className={cn('rounded-md px-2.5 py-1 text-xs transition-colors sm:px-3 sm:text-sm', view === id ? 'bg-border-strong text-fg' : 'text-muted hover:text-fg')}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 lg:mb-1">
        {view === 'weekday' && (
          <span className="font-mono text-xs text-muted">
            {dm(monday)} – {dm(addDays(monday, 6))}
          </span>
        )}
        {/* Month view: totals of the 12 bars. Day / week views leave the page month's totals to the calendar below. */}
        {view === 'month' && (
          <div className="grid w-full grid-cols-2 gap-2 rounded-lg bg-surface-2 px-3 py-2 text-xs">
            {SERIES.map((s) => (
              <div key={s} className="grid gap-0.5">
                <span className="text-subtle">{t(s === 'expense' ? 'tile.expense' : 'tile.income')}</span>
                <span className={cn('font-mono tabular-nums', STYLE[s].text)}>{formatVnd(sum(s))}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div aria-hidden="true" className="h-52 animate-pulse rounded-lg bg-surface-2 lg:h-auto lg:flex-1" />
      ) : (
        <div className="relative lg:min-h-0 lg:flex-1">
          {/* Grid + lines live in one overlay that matches the plot area; columns below only catch hover/focus. */}
          <div className="pointer-events-none absolute inset-x-0 top-5 bottom-6">
            <div aria-hidden="true" className="absolute inset-0 flex flex-col justify-between">
              <span className="border-t border-dashed border-border" />
              <span className="border-t border-dashed border-border" />
              <span className="border-t border-border-strong" />
            </div>
            <svg aria-hidden="true" viewBox={`0 0 ${bars.length * 100} 100`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
              <defs>
                <linearGradient id="spend-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--expense)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--expense)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {bars.length > 1 && <path d={`${expenseLine} L${(bars.length - 0.5) * 100} 100 L50 100 Z`} fill="url(#spend-fill)" />}
              {series.includes('income') && <path d={pathOf('income')} fill="none" stroke="var(--income)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
              <path d={expenseLine} fill="none" stroke="var(--expense)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </svg>
            {bars.map((b, i) => {
              // The higher of the two labels goes above its dot, the lower one below (unless it is near the axis).
              const expenseAbove = b.expense >= b.income
              return (
                <span key={b.key} aria-hidden="true" className="absolute inset-y-0 w-0" style={{ left: `${((i + 0.5) / bars.length) * 100}%` }}>
                  {series.map((s) => {
                    const v = b[s]
                    const pct = (v / max) * 100
                    const above = series.length === 1 || (s === 'expense') === expenseAbove || pct < 14
                    return (
                      <span key={s} className="absolute" style={{ bottom: `${pct}%` }}>
                        <span className={cn('absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface transition-all', STYLE[s].bg, 'size-2.5')} />
                        {v > 0 && (
                          <span className={cn('absolute left-1/2 -translate-x-1/2 font-mono text-[10px] whitespace-nowrap tabular-nums', STYLE[s].text, above ? 'bottom-2' : 'top-2')}>{formatShortVnd(v)}</span>
                        )}
                      </span>
                    )
                  })}
                </span>
              )
            })}
          </div>
          <div className="relative flex h-52 items-stretch lg:h-full">
            {bars.map((b) => (
              <div key={b.key} className="flex min-w-0 flex-1 flex-col items-center justify-end">
                <span className={cn('flex h-6 items-center text-[10px] whitespace-nowrap sm:text-[11px]', b.current ? 'font-semibold text-accent' : 'text-subtle')}>{b.short}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-2 text-xs text-subtle">
        {t('chart.avg')} <span className="font-mono text-fg tabular-nums">{formatVnd(avg)}</span> / {view === 'weekday' ? t('chart.perDay') : view === 'week' ? t('chart.perWeek') : t('chart.perMonth')}
      </div>
    </Card>
  )
}
