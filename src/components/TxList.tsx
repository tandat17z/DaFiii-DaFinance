import { useEffect, useRef, useState } from 'react'
import { cn } from '../lib/cn'
import { downloadCsv } from '../lib/csv'
import { categoryKey, TRANSFER_CATEGORIES, UNCATEGORIZED, WITHDRAWAL } from '../config/categories'
import { useCategories } from '../lib/settings'
import { isEarning, isSpending, isTransfer } from '../lib/transfers'
import { useFormat } from '../lib/format'
import { useI18n } from '../locales'
import type { Holding, Transaction } from '../lib/types'
import { CategoryPicker } from './CategoryPicker'
import { EditBubble } from './EditBubble'
import { Button, Card } from './ui'

const signed = (tx: Transaction) => (tx.type === 'income' ? tx.amount : -tx.amount)

/** Number of day columns that fit an element: 1 (narrow) or 2 (wide). */
function useColumns(): [number, (el: HTMLDivElement | null) => void] {
  const [n, setN] = useState(1)
  const [el, setEl] = useState<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!el) return
    const measure = () => setN(el.clientWidth >= 720 ? 2 : 1)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [el])
  return [n, setEl]
}

/** Month's transactions grouped by day (newest first), each day with its net total. */
export function TxList({ items, holdings = [], overIds, focusId, label, fileTag, onSave, onDelete, onCategorize }: { items: Transaction[]; holdings?: Holding[]; overIds?: Set<string>; focusId?: string | null; label: string; fileTag: string; onSave: (t: Transaction) => Promise<boolean>; onDelete: (id: string) => void; onCategorize: (t: Transaction, category: string) => void }) {
  const { t } = useI18n()
  const { formatDayHeader, formatVnd, categoryName } = useFormat()
  const cats = useCategories()
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<'all' | 'expense' | 'income' | 'transfer'>('all')
  const [category, setCategory] = useState('')
  const [onlyNone, setOnlyNone] = useState(false)
  // Row opened from a deep link: scrolled into view and outlined until another row is linked.
  const focusRef = useRef<HTMLLIElement>(null)
  useEffect(() => {
    if (!focusId) return
    // After layout settles (the period switch re-renders charts above the list).
    const id = setTimeout(() => focusRef.current?.scrollIntoView({ block: 'center' }), 150)
    return () => clearTimeout(id)
  }, [focusId])
  // The holding a deposit / withdrawal belongs to: by link, or (older deposits) by its name in the note.
  const holdingOf = (x: Transaction) => holdings.find((h) => (x.holdingId ? h.id === x.holdingId : h.name === x.note)) ?? null
  const isNone = (x: Transaction) => categoryKey(x.category) === UNCATEGORIZED
  const noneCount = items.filter(isNone).length
  const q = query.trim().toLowerCase()
  const matchesKind = (x: Transaction) => kind === 'all' || (kind === 'income' ? isEarning(x) : kind === 'expense' ? isSpending(x) : isTransfer(x))
  // Category choices: the keys of the selected type, plus any other key present in this period.
  const options = [...new Set([...(kind === 'all' ? [...cats.expenseWithTransfers, ...cats.income] : kind === 'transfer' ? [...TRANSFER_CATEGORIES, WITHDRAWAL] : cats[kind]), ...items.filter(matchesKind).map((x) => categoryKey(x.category))])]
  const shown = items
    .filter(matchesKind)
    .filter((x) => !onlyNone || isNone(x))
    .filter((x) => !category || categoryKey(x.category) === category)
    .filter((x) => !q || x.note.toLowerCase().includes(q) || x.category.toLowerCase().includes(q) || categoryName(x.category).toLowerCase().includes(q))
    .sort((a, b) => b.date.localeCompare(a.date) || (b.time ?? '').localeCompare(a.time ?? ''))

  const days = new Map<string, Transaction[]>()
  for (const x of shown) days.set(x.date, [...(days.get(x.date) ?? []), x])
  // Day cards sit side by side in 1 / 2 columns; each card goes to the currently shortest column (newest first).
  const [cols, measureRef] = useColumns()
  const columns: [string, Transaction[]][][] = Array.from({ length: cols }, () => [])
  const heights = Array<number>(cols).fill(0)
  for (const day of days) {
    const i = heights.indexOf(Math.min(...heights))
    columns[i].push(day)
    heights[i] += day[1].length + 1.5
  }

  return (
    <Card
      className="flex flex-col lg:h-full"
      title={
        <span className="flex items-baseline gap-2">
          {t('list.title')}
          <span className="font-mono text-xs font-normal text-muted">{label}</span>
          {items.length > 0 && <span className="font-mono text-xs font-normal text-subtle">{shown.length}</span>}
        </span>
      }
      action={
        <div className="flex w-full gap-2 sm:w-auto">
          <input type="search" aria-label={t('list.search')} className="field min-w-0 flex-1 sm:w-56" placeholder={t('list.searchPlaceholder')} value={query} onChange={(e) => setQuery(e.target.value)} />
          <Button onClick={() => downloadCsv(items, `dafinance-${fileTag}.csv`)} disabled={!items.length}>
            {t('list.export')}
          </Button>
        </div>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div role="radiogroup" aria-label={t('form.type')} className="flex rounded-lg border border-border bg-surface-2 p-0.5">
          {(['all', 'expense', 'income', 'transfer'] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => {
                setKind(k)
                setCategory('')
              }}
              className={cn('rounded-md px-2.5 py-1 text-xs transition-colors', kind === k ? 'bg-border-strong text-fg' : 'text-muted hover:text-fg')}
            >
              {k === 'all' ? t('list.all') : t(k === 'expense' ? 'tile.expense' : k === 'income' ? 'tile.income' : 'list.transfers')}
            </button>
          ))}
        </div>
        <select aria-label={t('form.category')} className="field min-w-0 max-w-44 py-1 text-xs" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">{t('list.allCategories')}</option>
          {options.map((c) => (
            <option key={c} value={c}>
              {categoryName(c)}
            </option>
          ))}
        </select>
        {noneCount > 0 && (
          <button
            type="button"
            aria-pressed={onlyNone}
            onClick={() => setOnlyNone((v) => !v)}
            className={cn('rounded-md border px-2 py-1 text-xs transition-colors', onlyNone ? 'border-cat-2 bg-cat-2/20 text-cat-2' : 'border-cat-2/40 text-cat-2 hover:bg-cat-2/10')}
          >
            {onlyNone ? t('list.showUncategorized') : t('list.uncategorizedCount', { count: noneCount })}
          </button>
        )}
      </div>
      {shown.length === 0 ? (
        <p className="py-12 text-center text-sm text-subtle">{items.length ? t('list.noResults') : t('list.empty')}</p>
      ) : (
        <div ref={measureRef} className="-mr-2 flex max-h-[34rem] items-stretch overflow-y-auto pr-2 lg:max-h-none lg:min-h-0 lg:flex-1 [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]" tabIndex={0} role="region" aria-label={t('list.title')}>
          {columns.map((column, ci) => (
            <div key={ci} className={cn('grid min-w-0 flex-1 content-start gap-7', ci > 0 && 'ml-8 border-l border-border pl-8 xl:ml-10 xl:pl-10')}>
          {column.map(([date, list]) => {
            const net = list.reduce((s, x) => s + signed(x), 0)
            return (
              <section key={date} aria-label={formatDayHeader(date)}>
                <header className="sticky top-0 z-[1] mb-1 flex items-baseline justify-between gap-3 border-b border-border bg-surface pb-2">
                  <h3 className="text-xs font-medium text-muted">{formatDayHeader(date)}</h3>
                  <span className={cn('font-mono text-xs tabular-nums', net >= 0 ? 'text-income' : 'text-subtle')}>
                    {net >= 0 ? '+' : '−'}
                    {formatVnd(Math.abs(net))}
                  </span>
                </header>
                <ul className="divide-y divide-border/50">
                  {list.map((tx) => (
                    <li
                      key={tx.id}
                      ref={tx.id === focusId ? focusRef : undefined}
                      aria-current={tx.id === focusId || undefined}
                      className={cn(
                        'group -mx-2 grid grid-cols-[2rem_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1.5 rounded-lg border-l-2 px-2 py-4 transition-colors hover:bg-surface-2 sm:gap-x-4',
                        tx.id === focusId ? 'border-accent bg-accent/10 ring-1 ring-accent/40' : isNone(tx) ? 'border-cat-2 bg-cat-2/5' : overIds?.has(tx.id) ? 'border-over bg-over/10' : 'border-transparent',
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn('row-span-2 grid size-8 place-items-center rounded-lg text-base', tx.type === 'income' ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense')}
                      >
                        {cats.iconOf(tx.category)}
                      </span>
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 self-center text-sm">
                        <span className={cn('shrink-0', isNone(tx) && 'text-cat-2')}>{categoryName(tx.category)}</span>
                        {tx.time && <span className="shrink-0 font-mono text-xs text-subtle">{tx.time}</span>}
                        {isTransfer(tx) && <span className="shrink-0 rounded-full border border-inc-4/40 px-1.5 py-px text-[10px] text-inc-4">{t('list.transferBadge')}</span>}
                        {tx.forMonth && (
                          <span className={cn('shrink-0 rounded-full border px-1.5 py-px text-[10px]', tx.type === 'income' ? 'border-income/40 text-income' : 'border-expense/40 text-expense')}>{t('list.forMonth', { month: `${Number(tx.forMonth.slice(5, 7))}/${tx.forMonth.slice(0, 4)}` })}</span>
                        )}
                      </div>
                      <span className={cn('self-center text-right font-mono text-sm whitespace-nowrap tabular-nums', tx.type === 'income' ? 'text-income' : overIds?.has(tx.id) ? 'text-over' : 'text-fg')}>
                        {tx.type === 'income' ? '+' : '−'}
                        {formatVnd(tx.amount)}
                      </span>
                      <div className="min-w-0 truncate self-center text-xs text-muted">{tx.note}</div>
                      {/* Always visible on touch screens; revealed on hover / focus where there is a mouse. */}
                      <div className="flex items-center justify-end gap-1 text-xs transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:opacity-100">
                        {isNone(tx) && <CategoryPicker tx={tx} onPick={(c) => onCategorize(tx, c)} />}
                        <EditBubble tx={tx} holding={holdingOf(tx)} onSave={onSave} label={t('list.editAria', { category: categoryName(tx.category), amount: formatVnd(tx.amount) })}>
                          {t('list.edit')}
                        </EditBubble>
                        <button
                          type="button"
                          className="rounded-md px-2.5 py-1.5 text-muted hover:bg-bg hover:text-expense active:bg-bg [@media(pointer:coarse)]:min-h-10 [@media(pointer:coarse)]:px-3.5"
                          onClick={() => confirm(t('list.confirmDelete')) && onDelete(tx.id)}
                          aria-label={t('list.deleteAria', { category: categoryName(tx.category), amount: formatVnd(tx.amount) })}
                        >
                          {t('list.delete')}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
