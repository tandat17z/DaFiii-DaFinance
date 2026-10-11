import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { categoryKey } from '../config/categories'
import { useFormat } from '../lib/format'
import { isTransfer, isTransferIn } from '../lib/transfers'
import { useI18n } from '../locales'
import type { Transaction, TxType } from '../lib/types'
import { cn } from '../lib/cn'
import { useCategories } from '../lib/settings'
import { inSheet } from '../lib/sheet'
import { Bubble } from './Bubble'
import { Card } from './ui'

// Literal class names so Tailwind can see them.
/** What the chart splits: real spending, income, or money moved into and out of savings / investments. */
export type CatKind = TxType | 'transfer'

const PALETTE = {
  transfer: {
    bg: ['bg-inc-4', 'bg-cat-5', 'bg-cat-2', 'bg-inc-1', 'bg-inc-3'],
    stroke: ['stroke-inc-4', 'stroke-cat-5', 'stroke-cat-2', 'stroke-inc-1', 'stroke-inc-3'],
  },
  expense: {
    bg: ['bg-cat-1', 'bg-cat-2', 'bg-cat-3', 'bg-cat-4', 'bg-cat-5'],
    stroke: ['stroke-cat-1', 'stroke-cat-2', 'stroke-cat-3', 'stroke-cat-4', 'stroke-cat-5'],
  },
  income: {
    bg: ['bg-inc-1', 'bg-inc-2', 'bg-inc-3', 'bg-inc-4', 'bg-inc-5'],
    stroke: ['stroke-inc-1', 'stroke-inc-2', 'stroke-inc-3', 'stroke-inc-4', 'stroke-inc-5'],
  },
} as const
/**
 * Each category keeps its own hue (index into PALETTE) in every view, so toggling a filter or
 * changing the period never recolours it. Categories not listed share the grey.
 */
const HUE_ORDER: Record<CatKind, string[]> = {
  expense: ['food', 'housing', 'transport', 'shopping', 'entertainment'],
  income: ['salary', 'bonus', 'interest', 'investment', 'gift'],
  // Put in (savings, investment) and taken out to spend (withdrawal, amber like on the calendar).
  transfer: ['savings', 'investment', 'withdrawal'],
}
const hueOf = (type: CatKind, key: string) => HUE_ORDER[type].indexOf(key)
const TITLE = { expense: 'cat.title', income: 'cat.titleIncome', transfer: 'cat.titleTransfer' } as const
const CAPTION = { expense: 'cat.total', income: 'cal.totalIncome', transfer: 'cat.totalMoved' } as const
const bgOf = (type: CatKind, i: number) => PALETTE[type].bg[i] ?? 'bg-cat-other'
const strokeOf = (type: CatKind, i: number) => PALETTE[type].stroke[i] ?? 'stroke-cat-other'

type Slice = { name: string; pct: number; offset: number; cls: string }

/**
 * Donut of a split. Slices use `hue` (index into the palette) when given, else their rank.
 * Slices are keyed by name and animate (CSS transition) when the data changes: new ones grow in,
 * missing ones shrink to nothing, the rest slide to their new size and position.
 * Clicking a slice pops it out and shows its name, share and total in the middle.
 */
export function Donut({ data, total, caption, center, type }: { data: { name: string; total: number; hue?: number }[]; total: number; caption: string; center?: ReactNode; type: CatKind }) {
  const { t } = useI18n()
  const { formatShortVnd, formatVnd } = useFormat()
  const [selected, setSelected] = useState<string | null>(null)
  const R = 15.915 // circumference = 100, so dash lengths are percentages
  const gap = data.length > 1 ? 0.6 : 0
  const target = useMemo(
    () =>
      data.map<Slice>((d, i) => ({
        name: d.name,
        pct: (d.total / total) * 100,
        offset: (data.slice(0, i).reduce((sum, x) => sum + x.total, 0) / total) * 100,
        cls: strokeOf(type, d.hue ?? i),
      })),
    [data, total, type],
  )
  const [drawn, setDrawn] = useState<Slice[]>(target)

  useEffect(() => {
    const names = new Set(target.map((x) => x.name))
    // Phase 1: new slices start empty at their final position; slices that vanished are kept so they can shrink.
    // oxlint-disable-next-line react/set-state-in-effect -- two-step state so the CSS transition has a start frame
    setDrawn((prev) => {
      const known = new Set(prev.map((x) => x.name))
      const kept = prev.filter((x) => names.has(x.name) || x.pct > 0)
      return [...kept, ...target.filter((x) => !known.has(x.name)).map((x) => ({ ...x, pct: 0 }))]
    })
    // Phase 2 (next frame, so the browser has painted phase 1): move everything to its target.
    const id = requestAnimationFrame(() => {
      setDrawn((prev) => {
        const byName = new Map(target.map((x) => [x.name, x]))
        return prev.map((x) => byName.get(x.name) ?? { ...x, pct: 0 })
      })
    })
    return () => cancelAnimationFrame(id)
  }, [target])

  // The selected slice, if it is still in the data.
  const picked = data.find((d) => d.name === selected)
  const pickedPct = picked ? (picked.total / total) * 100 : 0
  const toggle = (name: string) => setSelected((cur) => (cur === name ? null : name))

  return (
    <div className="relative mx-auto size-44 shrink-0">
      <svg viewBox="0 0 42 42" role="group" aria-label={t('cat.donut')} className="size-full -rotate-90 overflow-visible" onClick={(e) => e.target === e.currentTarget && setSelected(null)}>
        <circle cx="21" cy="21" r={R} fill="none" strokeWidth="6" className="stroke-surface-2" onClick={() => setSelected(null)} />
        {drawn.map((s) => {
          const active = s.name === selected
          // Pop out along the slice's middle direction (local coordinates: 0° is 3 o'clock, clockwise, before the svg rotation).
          const mid = ((s.offset + s.pct / 2) / 100) * 2 * Math.PI
          const out = active ? 1.6 : 0
          return (
            <circle
              key={s.name}
              cx="21"
              cy="21"
              r={R}
              fill="none"
              strokeWidth={active ? 7 : 6}
              strokeDasharray={`${Math.max(0, s.pct - gap)} ${100 - Math.max(0, s.pct - gap)}`}
              strokeDashoffset={-s.offset}
              style={{ transform: `translate(${(Math.cos(mid) * out).toFixed(2)}px, ${(Math.sin(mid) * out).toFixed(2)}px)`, opacity: selected && !active ? 0.4 : 1 }}
              className={`${s.cls} cursor-pointer outline-none transition-[stroke-dasharray,stroke-dashoffset,stroke-width,transform,opacity] duration-300 ease-out`}
              role="button"
              tabIndex={s.pct > 0 ? 0 : -1}
              aria-pressed={active}
              aria-label={`${s.name}: ${Math.round(s.pct)}%`}
              onClick={(e) => {
                e.stopPropagation()
                toggle(s.name)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggle(s.name)
                }
              }}
            >
              <title>{`${s.name}: ${Math.round(s.pct)}%`}</title>
            </circle>
          )
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 grid place-content-center px-7 text-center">
        {picked ? (
          <>
            <span className="truncate font-mono text-[10px] tracking-wider text-subtle uppercase">{picked.name}</span>
            <span className="font-mono text-lg leading-tight font-semibold tabular-nums">{Math.round(pickedPct)}%</span>
            <span className="font-mono text-xs tabular-nums">{formatVnd(picked.total)}</span>
          </>
        ) : (
          <>
            <span className="font-mono text-[10px] tracking-wider text-subtle uppercase">{caption}</span>
            {center ?? <span className="font-mono text-sm font-semibold tabular-nums">{formatShortVnd(total)}</span>}
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Expense by category: a donut plus ranked bars; each bar carries its own label and slice colour.
 * `aside` entries (assigned to a month, left out of the donut) are listed above as separate
 * "<category> (for month)" rows, so a category can appear twice.
 * `showBudget`: bars show the share of each category's monthly budget used (budgeted categories with
 * no spending are listed too); categories without a budget keep the ranked bar.
 */
export function CategoryChart({ items, aside, emptyText, toolbar, type = 'expense', className, stacked, showBudget }: { items: Transaction[]; aside?: Transaction[]; emptyText?: string; toolbar?: ReactNode; type?: CatKind; className?: string; stacked?: boolean; showBudget?: boolean }) {
  const { t } = useI18n()
  const { formatVnd, formatShortVnd, categoryName } = useFormat()
  const cats = useCategories()
  const group = (list: Transaction[]) => {
    const sums = new Map<string, { total: number; count: number; entries: Transaction[] }>()
    for (const x of list) {
      if (type === 'transfer' ? !isTransfer(x) : x.type !== type || isTransfer(x)) continue
      // Group by category key so legacy Vietnamese names and new keys merge.
      const key = categoryKey(x.category)
      const s = sums.get(key) ?? { total: 0, count: 0, entries: [] }
      sums.set(key, { total: s.total + x.amount, count: s.count + 1, entries: [...s.entries, x] })
    }
    return [...sums].map(([key, s]) => ({ key, name: categoryName(key), hue: hueOf(type, key), ...s })).sort((a, b) => b.total - a.total)
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const data = useMemo(() => group(items), [items, type, categoryName])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const asideData = useMemo(() => group(aside ?? []).map((d) => ({ ...d, key: `a:${d.key}`, name: `${d.name} (${t('cat.assignedSuffix')})`, isAside: true })), [aside, type, categoryName, t])
  const total = data.reduce((s, d) => s + d.total, 0)
  // Wealth: what went in minus what was taken out to spend (positive = wealth grew).
  const taken = type === 'transfer' ? data.filter((d) => d.entries.some(isTransferIn)).reduce((s, d) => s + d.total, 0) : 0
  const net = total - 2 * taken
  const netText = `${net >= 0 ? '+' : '−'}${formatShortVnd(Math.abs(net))}`
  const asideTotal = asideData.reduce((s, d) => s + d.total, 0)
  // Budgeted categories with nothing spent yet, listed after the rest so the limit stays visible.
  const unused = showBudget ? cats.expense.filter((k) => cats.budgetOf(k) > 0 && !data.some((d) => d.key === k)).map((key) => ({ key, name: categoryName(key), hue: hueOf(type, key), total: 0, count: 0, entries: [] as Transaction[], isAside: false })) : []
  const rows = [...asideData, ...data.map((d) => ({ ...d, isAside: false })), ...unused]

  // Clicking a category lists its entries in a bubble under the row, like a day in the calendar.
  const [openKey, setOpenKey] = useState<string | null>(null)
  const list = useRef<HTMLUListElement>(null)
  useEffect(() => {
    if (!openKey) return
    const onDown = (e: PointerEvent) => {
      if (!list.current?.contains(e.target as Node) && !inSheet(e.target)) setOpenKey(null)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenKey(null)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [openKey])

  return (
    <Card
      className={cn(stacked && 'flex flex-col', className)}
      title={t(TITLE[type])}
      action={
        total > 0 &&
        (type === 'transfer' && taken > 0 ? (
          <span className="font-mono text-xs text-subtle tabular-nums">
            <span className="text-inc-4">↑{formatShortVnd(total - taken)}</span> · <span className="text-cat-2">↓{formatShortVnd(taken)}</span>
          </span>
        ) : (
          <span className="font-mono text-xs text-subtle">{formatVnd(total)}</span>
        ))
      }
    >
      {toolbar}
      {rows.length === 0 && unused.length === 0 ? (
        <div className="grid place-items-center gap-2 py-14 text-center">
          <span aria-hidden="true" className="grid size-10 place-items-center rounded-full border border-border bg-surface-2 font-mono text-subtle">
            ∅
          </span>
          <p className="text-sm text-subtle">{emptyText ?? t('cat.empty')}</p>
        </div>
      ) : (
        <div className={cn('grid items-center gap-6', stacked ? 'lg:min-h-0 lg:flex-1 lg:grid-rows-[auto_minmax(0,1fr)] lg:items-start' : 'md:grid-cols-[11rem_1fr]')}>
        {data.length > 0 ? (
          <Donut
            type={type}
            data={data}
            total={total}
            caption={t(type === 'transfer' && taken > 0 ? 'cat.net' : CAPTION[type])}
            center={type === 'transfer' && taken > 0 ? <span className={cn('font-mono text-sm font-semibold tabular-nums', net >= 0 ? 'text-inc-4' : 'text-cat-2')}>{netText}</span> : undefined}
          />
        ) : (
          <div className="mx-auto grid size-44 shrink-0 place-items-center rounded-full border-[6px] border-surface-2 px-6 text-center text-xs text-subtle">{emptyText ?? t('cat.empty')}</div>
        )}
        <ul ref={list} className={cn('grid gap-3.5', stacked && 'lg:max-h-full lg:min-h-0 lg:content-start lg:overflow-y-auto lg:pr-1 [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]')} aria-label={t(TITLE[type])}>
          {rows.map((d) => {
            const groupTotal = d.isAside ? asideTotal : total
            const groupMax = d.isAside ? (asideData[0]?.total ?? 0) : (data[0]?.total ?? 0)
            const share = groupTotal > 0 ? d.total / groupTotal : 0
            const budget = showBudget && !d.isAside ? cats.budgetOf(d.key) : 0
            const used = budget > 0 ? d.total / budget : 0
            // Budget bar: own hue while under 80 %, amber when close, red once over.
            const barCls = budget > 0 ? (used > 1 ? 'bg-expense' : used >= 0.8 ? 'bg-cat-2' : bgOf(type, d.hue)) : bgOf(type, d.hue)
            const width = budget > 0 ? Math.min(100, used * 100) : groupMax === 0 ? 0 : Math.max(2, (d.total / groupMax) * 100)
            return (
              <li key={d.key} className={cn('relative', d.isAside && 'border-l-2 border-accent/60 pl-2.5')}>
                <button
                  type="button"
                  disabled={d.entries.length === 0}
                  aria-expanded={openKey === d.key}
                  onClick={() => setOpenKey(openKey === d.key ? null : d.key)}
                  className={cn('block w-full rounded-md text-left', d.entries.length > 0 && 'cursor-pointer hover:bg-surface-2/60', openKey === d.key && 'bg-surface-2/60')}
                >
                <div className="flex items-baseline gap-3 text-sm">
                  <span aria-hidden="true" className="w-5 shrink-0 self-center text-center text-base leading-none">{cats.iconOf(d.key.replace(/^a:/, ''))}</span>
                  <span className="min-w-0 flex-1 break-words">{d.name}</span>
                  <span className="font-mono text-xs whitespace-nowrap text-subtle">
                    {budget > 0 ? d.count > 0 && t('cat.count', { count: d.count }) : `${t('cat.count', { count: d.count })} · ${Math.round(share * 100)}%`}
                  </span>
                  <span className={cn('text-right font-mono text-xs whitespace-nowrap tabular-nums sm:w-28', type === 'transfer' && (d.entries.some(isTransferIn) ? 'text-cat-2' : 'text-inc-4'))}>
                    {type === 'transfer' && (d.entries.some(isTransferIn) ? '↓' : '↑')}
                    {formatVnd(d.total)}
                  </span>
                </div>
                <div className={cn('relative mt-1.5 rounded-full bg-surface-2', budget > 0 ? 'h-2' : 'h-1.5')} role={budget > 0 ? 'meter' : undefined} aria-valuemin={budget > 0 ? 0 : undefined} aria-valuemax={budget > 0 ? budget : undefined} aria-valuenow={budget > 0 ? d.total : undefined}>
                  <div className={`h-full rounded-full transition-[width] duration-500 ease-out ${barCls}`} style={{ width: `${width}%` }} />
                  {budget > 0 && used > 0.8 && used <= 1 && <span aria-hidden="true" className="absolute inset-y-0 left-[80%] w-px bg-bg/70" />}
                </div>
                {budget > 0 && (
                  <div className="mt-1 flex justify-between gap-2 font-mono text-[10px] tabular-nums text-subtle">
                    <span className={cn(used > 1 ? 'text-expense' : used >= 0.8 && 'text-cat-2')}>{t('budget.of', { pct: Math.round(used * 100), amount: formatShortVnd(budget) })}</span>
                    <span className={cn(used > 1 && 'text-expense')}>
                    {d.total === 0 ? t('budget.unused') : used > 1 ? t('budget.over', { amount: formatVnd(d.total - budget) }) : t('budget.left', { amount: formatVnd(budget - d.total) })}
                    </span>
                  </div>
                )}
                </button>
                {openKey === d.key && <EntriesBubble title={d.name} type={type} items={d.entries} onClose={() => setOpenKey(null)} />}
              </li>
            )
          })}
        </ul>
        </div>
      )}
    </Card>
  )
}

/** Entries of one category, newest first, each with its date; same look as the calendar's day bubble. */
function EntriesBubble({ title, type, items, onClose }: { title: string; type: CatKind; items: Transaction[]; onClose: () => void }) {
  const { t } = useI18n()
  const { formatVnd } = useFormat()
  const sorted = useMemo(() => [...items].sort((a, b) => b.date.localeCompare(a.date) || (b.time ?? '').localeCompare(a.time ?? '')), [items])
  const total = items.reduce((s, x) => s + x.amount, 0)
  return (
    <Bubble title={title} onClose={onClose} className="inset-x-0 top-full mt-1">
        <ul className="grid max-h-56 gap-1 overflow-auto max-sm:max-h-none">
          {sorted.map((x) => (
            <li key={x.id} className="flex items-center gap-2 rounded-md px-1.5 py-1.5 text-xs max-sm:text-sm">
              <span className="w-10 shrink-0 font-mono text-subtle">
                {x.date.slice(8, 10)}/{x.date.slice(5, 7)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{x.note || '—'}</span>
                {x.forMonth && <span className="block truncate text-[10px] text-subtle">{t('list.forMonth', { month: `${Number(x.forMonth.slice(5, 7))}/${x.forMonth.slice(0, 4)}` })}</span>}
              </span>
              <span className={cn('font-mono whitespace-nowrap tabular-nums', isTransferIn(x) ? 'text-cat-2' : type === 'income' ? 'text-income' : 'text-fg')}>
                {x.type === 'income' ? '+' : '−'}
                {formatVnd(x.amount)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex justify-between border-t border-border pt-2 text-xs text-muted max-sm:text-sm">
          {t('cat.count', { count: items.length })}
          <span className="font-mono text-fg tabular-nums">{formatVnd(total)}</span>
        </div>
    </Bubble>
  )
}
