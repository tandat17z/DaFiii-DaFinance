import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { categoryKey, TRANSFER_CATEGORIES } from '../config/categories'
import { cn } from '../lib/cn'
import { useCategories } from '../lib/settings'
import { useFormat } from '../lib/format'
import { entryKind } from '../lib/transfers'
import { useI18n } from '../locales'
import type { Holding, Transaction, TxType } from '../lib/types'
import { Button } from './ui'

const WIDTH = 304
/** Below this width the form is a bottom sheet: a floating bubble gets lost behind the phone keyboard. */
const SHEET_MAX = 640

const TITLE = { tx: 'form.edit', deposit: 'edit.deposit', withdrawal: 'edit.withdrawal', gain: 'edit.gain' } as const

/**
 * Edit button that opens a small bubble next to it to change a transaction in place, with the fields
 * its kind is entered with: an income / expense like the transaction form (type, category, time, for
 * month); a move into or out of savings / investments like the wealth forms (amount, date, note — the
 * holding is shown, the category follows the holding's type).
 */
export function EditBubble({ tx, holding, label, children, onSave }: { tx: Transaction; holding?: Holding | null; label: string; children: ReactNode; onSave: (tx: Transaction) => Promise<boolean> }) {
  const { t } = useI18n()
  const { categoryName } = useFormat()
  const cats = useCategories()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const [sheet, setSheet] = useState(false)
  const kind = entryKind(tx)
  const [d, setD] = useState({ type: tx.type as TxType, amount: '', category: '', date: '', time: '', note: '', forMonth: '' })
  const root = useRef<HTMLSpanElement>(null)
  const panel = useRef<HTMLFormElement>(null)
  const set = (patch: Partial<typeof d>) => setD((prev) => ({ ...prev, ...patch }))

  useEffect(() => {
    if (!open) return
    const inside = (e: Event) => e.target instanceof Node && (root.current?.contains(e.target) || panel.current?.contains(e.target))
    const onDown = (e: Event) => !inside(e) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    // Sheet: the backdrop closes it; opening the keyboard scrolls / resizes the page and must not.
    if (sheet) {
      document.addEventListener('keydown', onKey)
      return () => document.removeEventListener('keydown', onKey)
    }
    // Fixed to the viewport (the list scrolls and would clip it), so close when something else scrolls.
    const onScroll = (e: Event) => !inside(e) && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    const onResize = () => setOpen(false)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open, sheet])

  const openBubble = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (open) return setOpen(false)
    const r = e.currentTarget.getBoundingClientRect()
    setSheet(window.innerWidth < SHEET_MAX)
    setPos({
      top: window.innerHeight - r.bottom < 420 ? Math.max(8, r.top - 410) : r.bottom + 4,
      left: Math.max(8, Math.min(r.right - WIDTH, window.innerWidth - WIDTH - 8)),
    })
    setD({ type: tx.type, amount: String(tx.amount), category: categoryKey(tx.category), date: tx.date, time: tx.time ?? '', note: tx.note, forMonth: tx.forMonth ?? '' })
    setOpen(true)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const amount = Math.round(Number(d.amount))
    if (!amount || amount <= 0 || saving) return
    setSaving(true)
    const ok = await onSave(
      kind === 'tx'
        ? { ...tx, type: d.type, amount, category: d.category, date: d.date, time: d.time || null, note: d.note.trim(), forMonth: d.forMonth || null }
        : // Moves keep their type and link; only a deposit's category (savings / investment) can change.
          { ...tx, amount, category: kind === 'deposit' ? d.category : tx.category, date: d.date, note: d.note.trim() },
    )
    setSaving(false)
    if (ok) setOpen(false)
  }

  // Ordinary entries pick from their type's categories (no transfer ones: those are entered as wealth moves).
  const base = cats[d.type]
  const options = base.includes(d.category) ? base : [d.category, ...base]
  const pickType = (type: TxType) => set({ type, category: type === d.type ? d.category : (cats[type][0] ?? d.category) })
  const field = 'grid gap-1 text-xs text-muted'

  return (
    <span ref={root}>
      <button type="button" aria-haspopup="dialog" aria-expanded={open} aria-label={label} onClick={openBubble} className="rounded-md px-2.5 py-1.5 text-muted hover:bg-bg hover:text-fg active:bg-bg [@media(pointer:coarse)]:min-h-10 [@media(pointer:coarse)]:px-3.5">
        {children}
      </button>
      {open &&
        createPortal(
          <>
            {sheet && <div aria-hidden="true" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-black/60" />}
          <form
            ref={panel}
            role="dialog"
            aria-label={t(TITLE[kind])}
            onSubmit={submit}
            style={sheet ? undefined : { top: pos.top, left: pos.left, width: WIDTH }}
            className={
              sheet
                ? 'edit-sheet fixed inset-x-0 bottom-0 z-50 grid max-h-[85dvh] gap-3 overflow-y-auto rounded-t-2xl border border-border-strong bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg shadow-black/60'
                : 'fixed z-50 grid gap-2.5 rounded-xl border border-border-strong bg-surface p-3 shadow-lg shadow-black/40'
            }
          >
            <div className="text-sm font-medium">{t(TITLE[kind])}</div>
            {kind === 'tx' ? (
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface-2 p-0.5" role="radiogroup" aria-label={t('form.type')}>
                {(['expense', 'income'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    role="radio"
                    aria-checked={d.type === type}
                    onClick={() => pickType(type)}
                    className={cn('rounded-md py-1 text-xs font-medium transition-colors', d.type === type ? (type === 'expense' ? 'bg-expense/15 text-expense' : 'bg-income/15 text-income') : 'text-muted hover:text-fg')}
                  >
                    {type === 'expense' ? t('tile.expense') : t('tile.income')}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-inc-4/30 bg-inc-4/10 px-2.5 py-1.5 text-xs">
                <span className="text-muted">{t('edit.holding')}</span>
                <span className="min-w-0 truncate font-medium text-inc-4">{holding?.name ?? (tx.note || t('edit.noHolding'))}</span>
              </div>
            )}
            <label className={field}>
              {t('form.amount')}
              <input autoFocus={!sheet} className="field font-mono" type="number" inputMode="numeric" min={1} step={1} required value={d.amount} onChange={(e) => set({ amount: e.target.value })} />
            </label>
            {kind === 'tx' && (
              <label className={field}>
                {t('form.category')}
                <select className="field" value={d.category} onChange={(e) => set({ category: e.target.value })}>
                  {options.map((c) => (
                    <option key={c} value={c}>
                      {cats.iconOf(c)} {categoryName(c)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {kind === 'deposit' && (
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface-2 p-0.5" role="radiogroup" aria-label={t('pf.kind')}>
                {TRANSFER_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={d.category === c}
                    onClick={() => set({ category: c })}
                    className={cn('rounded-md py-1 text-xs font-medium transition-colors', d.category === c ? 'bg-accent/15 text-accent' : 'text-muted hover:text-fg')}
                  >
                    {cats.iconOf(c)} {categoryName(c)}
                  </button>
                ))}
              </div>
            )}
            {kind === 'tx' ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <label className={field}>
                    {t('form.date')}
                    <input className="field" type="date" required value={d.date} onChange={(e) => set({ date: e.target.value })} />
                  </label>
                  <label className={field}>
                    {t('form.time')}
                    <input className="field" type="time" value={d.time} onChange={(e) => set({ time: e.target.value })} />
                  </label>
                </div>
                <label className={field}>
                  {t('form.forMonth')}
                  <span className="flex gap-2">
                    <input className="field min-w-0 flex-1" type="month" value={d.forMonth} onChange={(e) => set({ forMonth: e.target.value })} />
                    {d.forMonth && (
                      <Button type="button" onClick={() => set({ forMonth: '' })}>
                        {t('form.reset')}
                      </Button>
                    )}
                  </span>
                </label>
              </>
            ) : (
              <label className={field}>
                {t('form.date')}
                <input className="field" type="date" required value={d.date} onChange={(e) => set({ date: e.target.value })} />
              </label>
            )}
            <label className={field}>
              {t('form.note')}
              <input className="field" maxLength={100} value={d.note} onChange={(e) => set({ note: e.target.value })} />
            </label>
            {kind !== 'tx' && <p className="text-[11px] leading-snug text-subtle">{t('edit.moveHint')}</p>}
            <div className="flex gap-2 pt-0.5">
              <Button type="submit" variant="primary" className="flex-1" disabled={saving}>
                {saving ? t('form.saving') : t('form.update')}
              </Button>
              <Button type="button" onClick={() => setOpen(false)}>
                {t('form.cancel')}
              </Button>
            </div>
          </form>
          </>,
          document.body,
        )}
    </span>
  )
}
