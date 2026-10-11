import { useState, type FormEvent } from 'react'
import { cn } from '../lib/cn'
import { todayIso, useFormat } from '../lib/format'
import { planWithdrawal, valueOf } from '../lib/holdings'
import type { Holding } from '../lib/types'
import { useI18n } from '../locales'
import { Button, Card, Label } from './ui'

export interface Withdrawal {
  holding: Holding
  amount: number
  /** Empty the holding, whatever the amount. */
  all: boolean
  date: string
  note: string
}

const signed = (n: number) => (n >= 0 ? '+' : '−')

/** Take money out of a savings / investment holding back into cash, to spend. */
export function WithdrawForm({ holdings, initialId, onSave }: { holdings: Holding[]; initialId: string | null; onSave: (w: Withdrawal) => Promise<boolean> }) {
  const { t } = useI18n()
  const { formatVnd } = useFormat()
  const [id, setId] = useState(() => (initialId && holdings.some((h) => h.id === initialId) ? initialId : (holdings[0]?.id ?? '')))
  const [all, setAll] = useState(false)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayIso)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const holding = holdings.find((h) => h.id === id) ?? null

  if (!holding) {
    return (
      <Card title={t('wd.title')}>
        <p className="py-6 text-center text-sm text-subtle">{t('wd.none')}</p>
      </Card>
    )
  }

  const value = valueOf(holding, date)
  // "Withdraw all" starts from the recorded value; type what you really got if it differs.
  const typed = Math.round(Number(amount))
  const n = amount === '' ? (all ? value : 0) : typed
  const tooMuch = !all && n > value
  const tooEarly = date < holding.startDate
  const plan = n > 0 ? planWithdrawal(holding, n, all, date) : null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!(n > 0) || tooMuch || tooEarly || saving) return
    setSaving(true)
    const ok = await onSave({ holding, amount: n, all, date, note: note.trim() })
    setSaving(false)
    // Keep what was typed when saving failed.
    if (ok) {
      setAmount('')
      setNote('')
      setAll(false)
    }
  }

  return (
    <Card title={t('wd.title')}>
      <form onSubmit={submit} className="grid gap-3.5">
        <Label text={t('wd.from')}>
          <select className="field" value={id} onChange={(e) => setId(e.target.value)}>
            {holdings.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} — {formatVnd(valueOf(h))}
              </option>
            ))}
          </select>
        </Label>

        <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface-2 p-1" role="radiogroup" aria-label={t('wd.mode')}>
          {([false, true] as const).map((v) => (
            <button
              key={String(v)}
              type="button"
              role="radio"
              aria-checked={all === v}
              onClick={() => {
                setAll(v)
                setAmount('')
              }}
              className={cn('rounded-md py-1.5 text-sm font-medium transition-colors', all === v ? 'bg-accent/15 text-accent' : 'text-muted hover:text-fg')}
            >
              {t(v ? 'wd.all' : 'wd.part')}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Label text={t(all ? 'wd.received' : 'wd.amount')}>
            <input
              className="field font-mono"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              required={!all}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={all ? String(value) : '0'}
              aria-invalid={tooMuch || undefined}
            />
            {tooMuch ? <span className="text-xs text-expense">{t('wd.tooMuch', { amount: formatVnd(value) })}</span> : <span className="text-xs text-subtle">{t('wd.available', { amount: formatVnd(value) })}</span>}
          </Label>
          <Label text={t('form.date')}>
            <input className="field" type="date" required min={holding.startDate} value={date} onChange={(e) => setDate(e.target.value)} />
            {tooEarly && <span className="text-xs text-expense">{t('wd.tooEarly', { date: holding.startDate })}</span>}
          </Label>
        </div>

        <Label text={t('form.note')}>
          <input className="field" maxLength={100} value={note} onChange={(e) => setNote(e.target.value)} placeholder={holding.name} />
        </Label>

        {plan && !tooMuch && (
          <dl className="grid gap-1.5 rounded-lg border border-border bg-surface-2 p-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t('wd.toCash')}</dt>
              <dd className="font-mono text-cat-2 tabular-nums">+{formatVnd(n)}</dd>
            </div>
            <div className="flex justify-between gap-3 text-xs">
              <dt className="text-subtle">{t('wd.principalBack')}</dt>
              <dd className="font-mono tabular-nums">{formatVnd(plan.principal)}</dd>
            </div>
            {plan.gain !== 0 && (
              <div className="flex justify-between gap-3 text-xs">
                <dt className="text-subtle">{t(plan.gain > 0 ? 'wd.gain' : 'wd.loss')}</dt>
                <dd className={cn('font-mono tabular-nums', plan.gain > 0 ? 'text-income' : 'text-expense')}>
                  {signed(plan.gain)}
                  {formatVnd(Math.abs(plan.gain))}
                </dd>
              </div>
            )}
            <div className="mt-1 flex justify-between gap-3 border-t border-border pt-1.5">
              <dt className="text-muted">{t('wd.left')}</dt>
              <dd className="font-mono tabular-nums">{plan.rest.currentValue === 0 ? t('wd.closed') : formatVnd(plan.rest.currentValue)}</dd>
            </div>
            <p className="text-xs text-subtle">{t(plan.gain > 0 ? 'wd.hintGain' : 'wd.hint')}</p>
          </dl>
        )}

        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? t('form.saving') : t('wd.submit')}
        </Button>
      </form>
    </Card>
  )
}
