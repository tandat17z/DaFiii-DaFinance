import { useEffect, useMemo, useState } from 'react'
import { AppHeader, AppMain, headerTabClass } from '@tada/kit/layout'
import { AppBrand } from '@tada/kit/brand'
import { changelog } from './config/changelog'
import { ApiNotice } from './components/ApiNotice'
import { DataModeBadge } from './components/DataModeBadge'
import { CategoryBreakdown } from './components/CategoryBreakdown'
import { PeriodBar } from './components/PeriodBar'
import { SplitPane } from './components/SplitPane'
import { SpendingCalendar } from './components/SpendingCalendar'
import { SpendingCharts } from './components/SpendingCharts'
import { Dashboard } from './components/Dashboard'
import { HoldingForm } from './components/HoldingForm'
import { Portfolio } from './components/Portfolio'
import { TxForm } from './components/TxForm'
import { TxList } from './components/TxList'
import { Button, HeroTile, StatTile } from './components/ui'
import { StorageNotice } from './components/StorageNotice'
import { SettingsLauncher } from './components/Settings'
import { API_ACCOUNT_URL, API_FEEDBACK_URL, API_ME_URL, type ApiError, STANDALONE, toApiError } from './lib/api'
import { askNotifyPermission, notifyOverBudget, overBudget, overBudgetIds } from './lib/budgetAlert'
import { cn } from './lib/cn'
import { useCategories } from './lib/settings'
import { usePeriodLabel } from './lib/usePeriodLabel'
import { todayIso, useFormat } from './lib/format'
import { valueOf } from './lib/holdings'
import { isSpending, isTransfer } from './lib/transfers'
import { inPeriod, isAssignedAway, rangeOf, type Unit } from './lib/range'
import { useAllTransactions, useHoldings, useLegacyImport, useStore } from './lib/storage'
import { LOCALES, type Locale } from '@tada/kit/i18n'
import { useI18n } from './locales'
import type { Holding, Transaction } from './lib/types'

/** Id from a `/tx/<id>` deep link, or null. */
function linkedTransactionId(): string | null {
  const m = /^\/tx\/([A-Za-z0-9-]{1,100})\/?$/.exec(window.location.pathname)
  return m ? m[1] : null
}

/** The $ of public/icons/icon-mark.svg, in the logo mark's colour. */
const DollarIcon = () => (
  <svg viewBox="7 6 18 20" className="h-3.5 w-[13px]" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
    <path d="M16 7v18M20.5 11H14a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6h-7" />
  </svg>
)

export default function App() {
  const { t, locale, setLocale } = useI18n()
  // Language picked in the account menu: switch in place instead of following a link.
  useEffect(() => {
    const onLanguage = (e: Event) => {
      const code = (e as CustomEvent<{ code: string }>).detail.code
      if (!(code in LOCALES)) return
      e.preventDefault()
      setLocale(code as Locale)
    }
    window.addEventListener('tdz-account:language', onLanguage)
    return () => window.removeEventListener('tdz-account:language', onLanguage)
  }, [setLocale])
  const { formatVnd, categoryName } = useFormat()
  const periodLabel = usePeriodLabel()
  const [period, setPeriod] = useState<{ unit: Unit; anchor: string }>(() => ({ unit: 'month', anchor: todayIso() }))
  const { unit, anchor } = period
  const store = useStore()
  const { budgetOf } = useCategories()
  const all = useAllTransactions()
  const overIds = useMemo(() => overBudgetIds(all.items, budgetOf), [all.items, budgetOf])
  const legacy = useLegacyImport(all.reload)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [actionError, setActionError] = useState<ApiError | null>(null)
  const [importing, setImporting] = useState(false)
  const [view, setView] = useState<'month' | 'entry' | 'portfolio' | 'dashboard'>('month')
  const holdings = useHoldings()
  const [entry, setEntry] = useState<'tx' | 'holding'>('tx')
  // The entry just saved, shown as a confirmation on the entry tab.
  const [saved, setSaved] = useState<Transaction | null>(null)
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null)
  // Deep link `/tx/<id>` (e.g. from the iPhone Shortcut notification): open that row's period and highlight it.
  const [linkedId, setLinkedId] = useState(linkedTransactionId)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [linkMissing, setLinkMissing] = useState(false)
  useEffect(() => {
    if (!linkedId || all.loading || all.error) return
    // The API only returns the signed-in owner's rows, so another account's id is simply "not found".
    const tx = all.items.find((x) => x.id === linkedId)
    // One-off sync with the URL once the list has loaded.
    // oxlint-disable-next-line react/set-state-in-effect
    setLinkedId(null)
    history.replaceState(null, '', '/')
    if (!tx) return setLinkMissing(true)
    setView('entry')
    setPeriod({ unit: 'month', anchor: tx.date })
    setFocusId(tx.id)
  }, [linkedId, all.loading, all.error, all.items])

  const [from, to] = rangeOf(unit, anchor)
  const markedDates = useMemo(() => new Set(all.items.map((x) => x.date)), [all.items])
  const items = useMemo(() => all.items.filter((x) => inPeriod(x, unit, [from, to])), [all.items, unit, from, to])
  // The period without the entries assigned to a month ("For month" set): only what is booked on its day.
  const itemsByDate = useMemo(() => all.items.filter((x) => x.date >= from && x.date <= to && !isAssignedAway(x)), [all.items, from, to])
  const total = (pick: (x: Transaction) => boolean) => items.reduce((s, x) => s + (pick(x) ? x.amount : 0), 0)
  const count = (pick: (x: Transaction) => boolean) => items.filter(pick).length
  const isIncome = (x: Transaction) => x.type === 'income'
  const income = total(isIncome)
  const expense = total(isSpending)
  // Money moved into savings / investments: out of the cash balance, but not spending.
  const moved = total(isTransfer)
  const balance = income - expense - moved
  // Running total over the whole history, whatever period is on screen.
  const totalIncome = all.items.reduce((s, x) => s + (x.type === 'income' ? x.amount : 0), 0)
  const totalExpense = all.items.reduce((s, x) => s + (isSpending(x) ? x.amount : 0), 0)
  const totalMoved = all.items.reduce((s, x) => s + (isTransfer(x) ? x.amount : 0), 0)
  const totalBalance = totalIncome - totalExpense - totalMoved
  const holdingsValue = holdings.items.reduce((s, h) => s + valueOf(h), 0)
  const holdingsProfit = holdingsValue - holdings.items.reduce((s, h) => s + h.principal, 0)
  // Headline number: cash only, or cash + what savings and investments are worth now (profit/loss included).
  const [withAssets, setWithAssets] = useState(() => {
    try {
      return localStorage.getItem('dafinance.heroAssets') === '1'
    } catch {
      return false
    }
  })
  const pickHero = (next: boolean) => {
    setWithAssets(next)
    try {
      localStorage.setItem('dafinance.heroAssets', next ? '1' : '0')
    } catch {
      // Not persisted; the choice still applies for this visit.
    }
  }
  const heroValue = withAssets ? totalBalance + holdingsValue : totalBalance
  /** Share of income kept in this period; null when there is no income to compare against. */
  const savings = income > 0 ? (income - expense) / income : null

  /** Runs a write and shows its error instead of throwing. Returns whether it succeeded. */
  const run = async (action: () => Promise<void>) => {
    setActionError(null)
    try {
      await action()
      all.reload()
      return true
    } catch (e) {
      setActionError(toApiError(e))
      return false
    }
  }

  /** Saves a holding; when asked, also records the principal as a transfer out of the cash balance. */
  const saveHoldingEntry = async (h: Holding, deduct: boolean) => {
    const ok = await run(async () => {
      await store.saveHolding(h)
      if (deduct && h.principal > 0) {
        await store.saveTransaction({ id: crypto.randomUUID(), type: 'expense', amount: h.principal, category: h.kind, date: h.startDate, note: h.name })
      }
    })
    holdings.reload()
    if (ok) setEditingHolding(null)
    return ok
  }
  const openHoldingForm = (h: Holding | null) => {
    setEditingHolding(h)
    setEntry('holding')
    setView('entry')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-dvh">
      <AppHeader
        brand={
          <>
            <AppBrand
              name="DaFinance"
              shortName="DaFiii"
              icon={<DollarIcon />}
              changelog={changelog}
              nameClassName="hidden sm:inline lg:hidden 2xl:inline"
              locale={locale}
            />
            <DataModeBadge />
          </>
        }
        navProps={{ role: 'tablist', 'aria-label': t('view.label') }}
        nav={VIEWS.map(([id, labelKey]) => (
          <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)} className={headerTabClass(view === id)}>
            {t(labelKey)}
          </button>
        ))}
        actionsClassName="flex-1 lg:flex-none"
        actions={<>{(view === 'month' || view === 'entry') && <PeriodBar className="min-w-0 flex-1 justify-center lg:flex-none" unit={unit} anchor={anchor} onChange={setPeriod} marked={markedDates} />}</>}
        account={
          <>
            <SettingsLauncher button={STANDALONE} />
            {!STANDALONE && <tdz-account key={locale} lang={locale} me-url={API_ME_URL} account-url={API_ACCOUNT_URL} feedback-url={API_FEEDBACK_URL} languages={Object.keys(LOCALES).join(';')} settings />}
          </>
        }
      />

      <AppMain>
        <StorageNotice
          onMoved={() => {
            all.reload()
            holdings.reload()
          }}
        />
        {view === 'dashboard' ? (
          <DashboardView />
        ) : view === 'entry' ? (
          <>
            {all.error && <ApiNotice error={all.error} onRetry={all.reload} />}
            {actionError && <ApiNotice error={actionError} />}
            <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
              <div className="grid grid-cols-[minmax(0,1fr)] content-start gap-3 lg:sticky lg:top-[4.5rem]">
                {saved && entry === 'tx' && (
                  <div role="status" className="flex flex-wrap items-center gap-x-2 rounded-xl border border-income/40 bg-income/10 px-4 py-2.5 text-sm">
                    {t('entry.saved')}: <span className="font-medium">{categoryName(saved.category)}</span>
                    <span className="font-mono tabular-nums">
                      {saved.type === 'income' ? '+' : '−'}
                      {formatVnd(saved.amount)}
                    </span>
                  </div>
                )}
                <div role="tablist" aria-label={t('entry.label')} className="flex rounded-lg border border-border bg-surface p-0.5">
                  {(['tx', 'holding'] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      role="tab"
                      aria-selected={entry === k}
                      onClick={() => setEntry(k)}
                      className={cn('flex-1 rounded-md px-3 py-1.5 text-sm transition-colors', entry === k ? 'bg-surface-2 text-fg' : 'text-muted hover:text-fg')}
                    >
                      {t(k === 'tx' ? 'entry.tx' : 'entry.holding')}
                    </button>
                  ))}
                </div>
                {entry === 'tx' ? (
                  <TxForm
                    key={editing?.id ?? 'new'}
                    editing={editing}
                    onSave={async (tx) => {
                      // Ask while the save tap still counts as a user gesture.
                      if (budgetOf(tx.category)) askNotifyPermission()
                      const ok = await run(() => store.saveTransaction(tx))
                      if (ok) {
                        const over = overBudget(all.items, tx, budgetOf(tx.category))
                        if (over) void notifyOverBudget(t('budget.alertTitle', { category: categoryName(tx.category) }), t('budget.over', { amount: formatVnd(over) }))
                        setEditing(null)
                        setSaved(tx)
                        // Keep the monthly view on the month of what was just saved.
                        if (!inPeriod(tx, unit, [from, to])) setPeriod({ unit, anchor: tx.date })
                      }
                      return ok
                    }}
                    onCancel={() => setEditing(null)}
                  />
                ) : (
                  <HoldingForm key={editingHolding?.id ?? 'new'} editing={editingHolding} onSave={saveHoldingEntry} onCancel={() => setEditingHolding(null)} />
                )}
              </div>
              {entry === 'tx' && (
                <div className="lg:h-[calc(100dvh-6rem)] lg:min-h-[30rem]">
                  <div className="lg:h-full">
                    <TxList items={items} overIds={overIds} focusId={focusId} label={periodLabel(unit, anchor)} fileTag={`${from}_${to}`} onSave={(tx) => run(() => store.saveTransaction(tx))} onDelete={(id) => void run(() => store.deleteTransaction(id))} onCategorize={(tx, category) => void run(() => store.saveTransaction({ ...tx, category }))} />
                  </div>
                </div>
              )}
            </div>
          </>
        ) : view === 'portfolio' ? (
          <>
            {holdings.error && <ApiNotice error={holdings.error} onRetry={holdings.reload} />}
            {actionError && <ApiNotice error={actionError} />}
            <Portfolio
              holdings={holdings.items}
              loading={holdings.loading || all.loading}
              cashBalance={totalBalance}
              onAdd={() => openHoldingForm(null)}
              onEdit={openHoldingForm}
              onDelete={(id) => void run(() => store.deleteHolding(id)).then(holdings.reload)}
            />
          </>
        ) : (
          <>
            {all.error && <ApiNotice error={all.error} onRetry={all.reload} />}
            {actionError && <ApiNotice error={actionError} />}
            {linkMissing && (
              <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-strong bg-surface p-4 text-sm">
                <p>{t('link.notFound')}</p>
                <Button onClick={() => setLinkMissing(false)}>{t('link.dismiss')}</Button>
              </div>
            )}

            {legacy.pending.length > 0 && store.kind === 'server' && !all.error && (
              <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/40 bg-accent/5 p-4 text-sm">
                <p>
                  {t('legacy.notice', { count: legacy.pending.length })}
                </p>
                <Button
                  variant="primary"
                  disabled={importing}
                  onClick={async () => {
                    setImporting(true)
                    await run(legacy.importAll)
                    setImporting(false)
                  }}
                >
                  {importing ? t('legacy.moving') : t('legacy.move')}
                </Button>
              </div>
            )}
    
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
              <HeroTile
                label={t(withAssets ? 'pf.totalAssets' : 'tile.total')}
                loading={all.loading}
                value={formatVnd(heroValue)}
                negative={heroValue < 0}
                sub={t(withAssets ? 'hero.subAssets' : 'tile.totalSub')}
                action={
                  <div role="radiogroup" aria-label={t('hero.view')} className="flex rounded-lg border border-border bg-bg/40 p-0.5 text-xs">
                    {([false, true] as const).map((v) => (
                      <button
                        key={String(v)}
                        type="button"
                        role="radio"
                        aria-checked={withAssets === v}
                        onClick={() => pickHero(v)}
                        className={cn('rounded-md px-2.5 py-1 transition-colors', withAssets === v ? 'bg-accent/20 text-accent' : 'text-muted hover:text-fg')}
                      >
                        {t(v ? 'hero.withAssets' : 'hero.cashOnly')}
                      </button>
                    ))}
                  </div>
                }
              >
                <div className="flex justify-between gap-3 text-muted">
                  {t('cal.totalIncome')} <span className="font-mono text-income tabular-nums">+{formatVnd(totalIncome)}</span>
                </div>
                <div className="flex justify-between gap-3 text-muted">
                  {t('cal.totalSpent')} <span className="font-mono text-expense tabular-nums">−{formatVnd(totalExpense)}</span>
                </div>
                {totalMoved > 0 && (
                  <div className="flex justify-between gap-3 text-muted">
                    {t('hero.moved')} <span className="font-mono text-inc-4 tabular-nums">−{formatVnd(totalMoved)}</span>
                  </div>
                )}
                {holdingsValue > 0 && (
                  <div className="flex justify-between gap-3 text-muted">
                    {t('pf.holdings')} <span className="font-mono text-fg tabular-nums">{withAssets ? '+' : ''}{formatVnd(holdingsValue)}</span>
                  </div>
                )}
                {withAssets && holdings.items.length > 0 && (
                  <div className="flex justify-between gap-3 text-muted">
                    {t('pf.profit')} <span className={cn('font-mono tabular-nums', holdingsProfit >= 0 ? 'text-income' : 'text-expense')}>{holdingsProfit >= 0 ? '+' : '−'}{formatVnd(Math.abs(holdingsProfit))}</span>
                  </div>
                )}
              </HeroTile>
              <div className="grid content-start gap-4 sm:grid-cols-2">
              <StatTile label={t('tile.income')} dot="bg-income" loading={all.loading} value={formatVnd(income)} valueClass="text-income" sub={t('tile.count', { count: count(isIncome) })} />
              <StatTile label={t('tile.expense')} dot="bg-expense" loading={all.loading} value={formatVnd(expense)} valueClass="text-expense" sub={t('tile.count', { count: count(isSpending) })} />
              <StatTile label={t('tile.moved')} dot="bg-inc-4" loading={all.loading} value={formatVnd(moved)} valueClass="text-inc-4" sub={t('tile.count', { count: count(isTransfer) })} />
              <StatTile
                label={t('tile.balance')}
                loading={all.loading}
                value={formatVnd(balance)}
                valueClass={balance < 0 ? 'text-expense' : 'text-fg'}
                sub={savings === null ? t('tile.noIncome') : savings >= 0 ? t('tile.saved', { pct: Math.round(savings * 100) }) : t('tile.over', { pct: Math.round(-savings * 100) })}
              >
                {savings !== null && (
                  <div className="mt-2.5 h-1 rounded-full bg-surface-2" role="presentation">
                    <div className={cn('h-full rounded-full', savings >= 0 ? 'bg-accent' : 'bg-expense')} style={{ width: `${Math.min(100, Math.abs(savings) * 100)}%` }} />
                  </div>
                )}
              </StatTile>
              </div>
            </div>
    
            {/* lg+: line chart + calendar on the left (narrow by default), category donut on the right; a draggable divider between, one screen high. */}
            <SplitPane
              storageKey="dafinance.split.v2"
              defaultRatio={0.36}
              className="lg:h-[calc(100dvh-7.5rem)] lg:min-h-[36rem]"
              left={
                <div className="grid gap-5 lg:h-full lg:min-h-0 lg:grid-rows-[minmax(0,5fr)_minmax(0,6fr)]">
                  <SpendingCharts all={all.items} anchor={anchor} loading={all.loading} />
                  <SpendingCalendar all={all.items} anchor={anchor} unit={unit} />
                </div>
              }
              right={<CategoryBreakdown className="lg:h-full lg:min-h-0" stacked items={items} byDate={itemsByDate} canAssign={unit === 'month' || unit === 'year'} showBudget={unit === 'month'} />}
            />
          </>
        )}
      </AppMain>
    </div>
  )
}

const VIEWS = [
  ['month', 'view.month'],
  ['entry', 'view.entry'],
  ['portfolio', 'view.portfolio'],
  ['dashboard', 'view.stats'],
] as const

/** Mounted only while its tab is open, so the full history is fetched on demand (and fresh each time). */
function DashboardView() {
  const { items, loading, error, reload } = useAllTransactions()
  return (
    <>
      {error && <ApiNotice error={error} onRetry={reload} />}
      <Dashboard items={items} loading={loading} />
    </>
  )
}
