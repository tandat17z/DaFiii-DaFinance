import { todayIso } from './format'
import type { Holding } from './types'

const DAY_MS = 86_400_000

/** Whole days from `from` to `to` (ISO dates), never negative. */
const daysBetween = (from: string, to: string) => Math.max(0, Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS))

/**
 * What a holding is worth today. With an interest rate it grows by itself — simple interest on the
 * principal, `principal × rate × days / 365`, which is how Vietnamese deposits accrue. Without a
 * rate (stocks, funds, gold…) the value is the one you last entered.
 */
export function valueOf(h: Holding, today = todayIso()): number {
  if (h.annualRate === null) return h.currentValue
  return Math.round(h.principal * (1 + (h.annualRate / 100) * (daysBetween(h.startDate, today) / 365)))
}

export const profitOf = (h: Holding, today = todayIso()) => valueOf(h, today) - h.principal

/** Emptied by a full withdrawal: kept (not deleted) so its history stays, but shown as closed. */
export const isClosed = (h: Holding) => h.principal === 0 && h.currentValue === 0

export interface WithdrawalPlan {
  /** What the holding is worth on the withdrawal date, before taking anything out. */
  value: number
  /** Part of the principal the amount takes back (in proportion to the value, or all of it). */
  principal: number
  /** amount − principal: profit taken (booked as interest income), or a loss when negative. */
  gain: number
  /** The holding after the withdrawal. */
  rest: Holding
}

/**
 * Takes `amount` out of a holding on `date`. A partial withdrawal takes the principal back in
 * proportion (`principal × amount / value`), so the rest keeps the same return — and for a holding
 * with a rate, the smaller principal accrues from the same start date to exactly `value − amount`.
 * `all` empties the holding whatever the amount (e.g. sold for more or less than its recorded value).
 */
export function planWithdrawal(h: Holding, amount: number, all: boolean, date = todayIso()): WithdrawalPlan {
  const value = valueOf(h, date)
  if (all || amount >= value) {
    return { value, principal: h.principal, gain: amount - h.principal, rest: { ...h, principal: 0, currentValue: 0 } }
  }
  const principal = value > 0 ? Math.min(h.principal, Math.round((h.principal * amount) / value)) : 0
  return { value, principal, gain: amount - principal, rest: { ...h, principal: h.principal - principal, currentValue: value - amount } }
}
