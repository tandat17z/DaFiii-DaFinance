import { useMemo } from 'react'
import { cn } from '../lib/cn'
import { todayIso, useFormat } from '../lib/format'
import { isClosed, valueOf } from '../lib/holdings'
import { shiftMonth } from '../lib/format'
import type { Holding, HoldingKind } from '../lib/types'
import { useI18n } from '../locales'
import { Donut } from './CategoryChart'
import { Button, Card, HeroTile, StatTile } from './ui'

const KINDS: HoldingKind[] = ['savings', 'investment']
const KIND_BG: Record<'cash' | HoldingKind, string> = { cash: 'bg-inc-1', savings: 'bg-inc-4', investment: 'bg-cat-5' }
const KIND_TEXT: Record<HoldingKind, string> = { savings: 'text-inc-4', investment: 'text-cat-5' }
/** Same order as the donut slices so legend dots match. */
const SLICE_BG = ['bg-inc-1', 'bg-inc-2', 'bg-inc-3', 'bg-inc-4', 'bg-inc-5']

const sumOf = (list: Holding[], pick: (h: Holding) => number) => list.reduce((s, h) => s + pick(h), 0)
const signed = (n: number) => (n >= 0 ? '+' : '−')

/**
 * Statistics for savings and investments: totals, allocation, profit per holding, how capital was
 * put in over time, and the holdings themselves. Adding or editing happens on the main tab.
 */
export function Portfolio({
  holdings,
  loading,
  cashBalance,
  onAdd,
  onEdit,
  onWithdraw,
  onDelete,
}: {
  holdings: Holding[]
  loading: boolean
  cashBalance: number
  onAdd: () => void
  onEdit: (h: Holding) => void
  onWithdraw: (h: Holding) => void
  onDelete: (id: string) => void
}) {
  const { t } = useI18n()
  const { formatVnd, formatShortVnd, formatMonthShort } = useFormat()

  const invested = sumOf(holdings, (h) => h.principal)
  const value = sumOf(holdings, (h) => valueOf(h))
  const profit = value - invested
  const pct = invested > 0 ? (profit / invested) * 100 : null
  const totalAssets = cashBalance + value
  const interestPerYear = sumOf(holdings, (h) => (h.annualRate === null ? 0 : (h.principal * h.annualRate) / 100))
  const byKind = (k: HoldingKind) => holdings.filter((h) => h.kind === k)
  // Emptied by a full withdrawal: listed apart, kept for the history.
  const closed = holdings.filter(isClosed)
  const active = holdings.filter((h) => !isClosed(h))

  const parts = [
    { id: 'cash' as const, label: t('pf.cash'), amount: Math.max(0, cashBalance) },
    { id: 'savings' as const, label: t('pf.savings'), amount: sumOf(byKind('savings'), (h) => valueOf(h)) },
    { id: 'investment' as const, label: t('pf.investment'), amount: sumOf(byKind('investment'), (h) => valueOf(h)) },
  ]
  const partTotal = parts.reduce((s, p) => s + p.amount, 0)

  // Every holding with its value, biggest first, for the donut and the profit bars.
  const rows = useMemo(
    () =>
      active
        .map((h) => {
          const now = valueOf(h)
          return { h, now, profit: now - h.principal, ret: h.principal > 0 ? ((now - h.principal) / h.principal) * 100 : null }
        })
        .sort((a, b) => b.now - a.now),
    [active],
  )
  const donutRows = rows.filter((r) => r.now > 0)
  const maxAbsProfit = Math.max(1, ...rows.map((r) => Math.abs(r.profit)))

  // Cumulative capital put in, month by month, from the first holding until now.
  const capital = useMemo(() => {
    if (holdings.length === 0) return []
    const thisMonth = todayIso().slice(0, 7)
    const months = holdings.map((h) => h.startDate.slice(0, 7))
    let m = months.reduce((a, b) => (a < b ? a : b))
    const end = months.reduce((a, b) => (a > b ? a : b), thisMonth)
    const out: { month: string; total: number }[] = []
    while (m <= end && out.length < 60) {
      out.push({ month: m, total: sumOf(holdings.filter((h) => h.startDate.slice(0, 7) <= m), (h) => h.principal) })
      m = shiftMonth(m, 1)
    }
    return out
  }, [holdings])
  const capMax = Math.max(1, ...capital.map((c) => c.total))
  const capPath = capital.map((c, i) => `${i ? 'L' : 'M'}${(i + 0.5) * 100} ${100 - (c.total / capMax) * 100}`).join(' ')
  const capStep = Math.ceil(capital.length / 8)

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <HeroTile label={t('pf.totalAssets')} loading={loading} value={formatVnd(totalAssets)} negative={totalAssets < 0} sub={t('pf.totalAssetsSub')}>
          {parts.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 text-muted">
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className={cn('size-2 rounded-sm', KIND_BG[p.id])} />
                {p.label}
              </span>
              <span className="font-mono text-fg tabular-nums">{formatVnd(p.id === 'cash' ? cashBalance : p.amount)}</span>
            </div>
          ))}
        </HeroTile>
        <div className="grid content-start gap-4 sm:grid-cols-2">
          <StatTile label={t('pf.invested')} loading={loading} value={formatVnd(invested)} sub={t('pf.count', { count: active.length })} />
          <StatTile label={t('pf.value')} loading={loading} value={formatVnd(value)} />
          <StatTile
            label={t('pf.profit')}
            loading={loading}
            value={`${signed(profit)}${formatVnd(Math.abs(profit))}`}
            valueClass={profit >= 0 ? 'text-income' : 'text-expense'}
            sub={pct === null ? t('pf.noInvested') : t('pf.return', { pct: `${signed(pct)}${Math.abs(pct).toFixed(1)}` })}
          />
          <StatTile label={t('pf.interestYear')} loading={loading} value={formatVnd(Math.round(interestPerYear))} valueClass="text-income" sub={t('pf.interestYearSub', { amount: formatVnd(Math.round(interestPerYear / 12)) })} />
        </div>
      </div>

      {holdings.length === 0 && !loading ? (
        <Card>
          <div className="grid place-items-center gap-3 py-10 text-center">
            <p className="text-sm text-subtle">{t('pf.empty')}</p>
            <Button variant="primary" onClick={onAdd}>
              {t('pf.add')}
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid items-start gap-5 lg:grid-cols-2">
            <Card title={t('pf.allocation')}>
              <div className="grid items-center gap-5 sm:grid-cols-[11rem_1fr]">
                {donutRows.length > 0 ? <Donut type="income" data={donutRows.map((r) => ({ name: r.h.name, total: r.now }))} total={value} caption={t('pf.value')} /> : <div className="text-sm text-subtle">{t('cat.emptyIncome')}</div>}
                <ul className="grid gap-2 text-sm">
                  {donutRows.slice(0, 5).map((r, i) => (
                    <li key={r.h.id} className="flex items-center gap-2">
                      <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-sm', SLICE_BG[i])} />
                      <span className="min-w-0 flex-1 truncate">{r.h.name}</span>
                      <span className="font-mono text-xs text-subtle tabular-nums">{Math.round((r.now / value) * 100)}%</span>
                    </li>
                  ))}
                  {donutRows.length > 5 && (
                    <li className="flex items-center gap-2 text-muted">
                      <span aria-hidden="true" className="size-2 shrink-0 rounded-sm bg-cat-other" />
                      <span className="flex-1">{t('cat.other')}</span>
                      <span className="font-mono text-xs tabular-nums">{Math.round((sumOf(donutRows.slice(5).map((r) => r.h), (h) => valueOf(h)) / value) * 100)}%</span>
                    </li>
                  )}
                </ul>
              </div>
              {partTotal > 0 && (
                <div className="mt-5 border-t border-border pt-4">
                  <div role="img" aria-label={parts.map((p) => `${p.label} ${Math.round((p.amount / partTotal) * 100)}%`).join(', ')} className="flex h-2.5 overflow-hidden rounded-full bg-surface-2">
                    {parts.map((p) => p.amount > 0 && <span key={p.id} className={cn('h-full', KIND_BG[p.id])} style={{ width: `${(p.amount / partTotal) * 100}%` }} />)}
                  </div>
                  <ul className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
                    {parts.map((p) => (
                      <li key={p.id} className="flex items-center gap-1.5">
                        <span aria-hidden="true" className={cn('size-2 rounded-sm', KIND_BG[p.id])} />
                        {p.label} <span className="font-mono text-fg tabular-nums">{Math.round((p.amount / partTotal) * 100)}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>

            <Card title={t('pf.profitBy')}>
              <ul className="grid gap-3.5" aria-label={t('pf.profitBy')}>
                {[...rows].sort((a, b) => b.profit - a.profit).map((r) => (
                  <li key={r.h.id}>
                    <div className="flex items-baseline gap-3 text-sm">
                      <span className="min-w-0 flex-1 truncate">{r.h.name}</span>
                      {r.ret !== null && (
                        <span className="font-mono text-xs text-subtle tabular-nums">
                          {signed(r.ret)}
                          {Math.abs(r.ret).toFixed(1)}%
                        </span>
                      )}
                      <span className={cn('w-28 text-right font-mono text-xs tabular-nums', r.profit >= 0 ? 'text-income' : 'text-expense')}>
                        {signed(r.profit)}
                        {formatVnd(Math.abs(r.profit))}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-surface-2">
                      <div className={cn('h-full rounded-full', r.profit >= 0 ? 'bg-income' : 'bg-expense')} style={{ width: `${Math.max(2, (Math.abs(r.profit) / maxAbsProfit) * 100)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card title={t('pf.capital')} action={<span className="font-mono text-xs text-subtle">{formatVnd(invested)}</span>}>
            <div className="relative h-44">
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-3 bottom-6 flex flex-col justify-between">
                <span className="relative border-t border-dashed border-border">
                  <span className="absolute -top-2 left-0 bg-surface pr-1 font-mono text-[10px] text-subtle">{formatShortVnd(capMax)}</span>
                </span>
                <span className="border-t border-dashed border-border" />
                <span className="border-t border-border-strong" />
              </div>
              <div className="absolute inset-x-0 top-3 bottom-6">
                <svg aria-hidden="true" viewBox={`0 0 ${capital.length * 100} 100`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
                  <defs>
                    <linearGradient id="cap-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--inc-4)" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="var(--inc-4)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {capital.length > 1 && <path d={`${capPath} L${(capital.length - 0.5) * 100} 100 L50 100 Z`} fill="url(#cap-fill)" />}
                  <path d={capPath} fill="none" stroke="var(--inc-4)" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                </svg>
                {capital.map((c, i) => (
                  <span key={c.month} aria-hidden="true" className="absolute size-2.5 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-surface bg-inc-4" style={{ left: `${((i + 0.5) / capital.length) * 100}%`, bottom: `${(c.total / capMax) * 100}%` }} />
                ))}
              </div>
              <div aria-hidden="true" className="absolute inset-x-0 bottom-0 flex h-6 items-center font-mono text-[10px] text-subtle">
                {capital.map((c, i) => (
                  <span key={c.month} className="min-w-0 flex-1 text-center whitespace-nowrap">
                    {i % capStep === 0 ? `${formatMonthShort(c.month)}${c.month.endsWith('-01') || i === 0 ? ` ${c.month.slice(2, 4)}` : ''}` : ''}
                  </span>
                ))}
              </div>
            </div>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            {KINDS.map((k) => {
              const list = rows.filter((r) => r.h.kind === k)
              if (list.length === 0) return null
              const kindProfit = sumOf(list.map((r) => r.h), (h) => valueOf(h) - h.principal)
              return (
                <Card
                  key={k}
                  title={
                    <span className="flex items-center gap-2">
                      <span aria-hidden="true" className={cn('size-2 rounded-sm', KIND_BG[k])} />
                      {t(k === 'savings' ? 'pf.savings' : 'pf.investment')}
                    </span>
                  }
                  action={
                    <span className="font-mono text-xs text-subtle tabular-nums">
                      {formatVnd(sumOf(list.map((r) => r.h), (h) => valueOf(h)))} · <span className={kindProfit >= 0 ? 'text-income' : 'text-expense'}>{signed(kindProfit)}{formatVnd(Math.abs(kindProfit))}</span>
                    </span>
                  }
                >
                  <ul className="-my-1 divide-y divide-border">
                    {list.map(({ h, now, profit: p, ret }) => (
                      <li key={h.id} className="group flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                        <div className="min-w-0 flex-1 basis-44">
                          <div className={cn('truncate text-sm font-medium', KIND_TEXT[h.kind])}>{h.name}</div>
                          <div className="truncate text-xs text-muted">
                            {t('pf.since', { date: h.startDate })}
                            {h.annualRate !== null && ` · ${h.annualRate}%/${t('pf.year')}`}
                            {h.annualRate !== null && h.principal > 0 && ` · ${t('pf.estInterest', { amount: formatVnd(Math.round((h.principal * h.annualRate) / 100)) })}`}
                            {h.note && ` · ${h.note}`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-sm tabular-nums">{formatVnd(now)}</div>
                          <div className={cn('font-mono text-xs tabular-nums', p >= 0 ? 'text-income' : 'text-expense')}>
                            {signed(p)}
                            {formatVnd(Math.abs(p))}
                            {ret !== null && ` (${signed(ret)}${Math.abs(ret).toFixed(1)}%)`}
                          </div>
                          <div className="font-mono text-[11px] text-subtle tabular-nums">{t('pf.investedShort', { amount: formatVnd(h.principal) })}</div>
                        </div>
                        <div className="flex text-xs sm:opacity-0 sm:transition-opacity sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                          <button className="rounded px-2 py-1 text-inc-4 hover:bg-bg" onClick={() => onWithdraw(h)}>
                            {t('pf.withdraw')}
                          </button>
                          <button className="rounded px-2 py-1 text-muted hover:bg-bg hover:text-fg" onClick={() => onEdit(h)}>
                            {t('list.edit')}
                          </button>
                          <button className="rounded px-2 py-1 text-muted hover:bg-bg hover:text-expense" onClick={() => confirm(t('pf.confirmDelete')) && onDelete(h.id)}>
                            {t('list.delete')}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card>
              )
            })}
          </div>

          {closed.length > 0 && (
            <Card title={t('pf.closed')} action={<span className="text-xs text-subtle">{t('pf.closedSub')}</span>}>
              <ul className="-my-1 divide-y divide-border">
                {closed.map((h) => (
                  <li key={h.id} className="group flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-sm text-muted">
                    <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-sm', KIND_BG[h.kind])} />
                    <span className="min-w-0 flex-1 truncate">{h.name}</span>
                    <span className="text-xs text-subtle">{t('pf.since', { date: h.startDate })}</span>
                    <button className="rounded px-2 py-1 text-xs text-muted hover:bg-bg hover:text-expense sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100" onClick={() => confirm(t('pf.confirmDelete')) && onDelete(h.id)}>
                      {t('list.delete')}
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
