export type TxType = 'income' | 'expense'

export interface Transaction {
  id: string
  type: TxType
  /** Integer amount in VND. */
  amount: number
  category: string
  /** ISO date, YYYY-MM-DD. */
  date: string
  note: string
  /** YYYY-MM the amount counts for when it differs from `date` (e.g. salary received in Sep for Oct). Absent = month of `date`. */
  forMonth?: string | null
  /** HH:MM (local) when known, e.g. from an iPhone receipt capture. */
  time?: string | null
  /** Holding the money moved into or out of (deposit / withdrawal); absent = none. */
  holdingId?: string | null
}

export interface CategoryTotal {
  category: string
  total: number
  /** Share of the month's total for that type, 0–1. */
  share: number
}

/** Monthly totals computed by the API (`GET /v1/finance/summary`). */
export interface Summary {
  month: string
  income: number
  expense: number
  balance: number
  expenseByCategory: CategoryTotal[]
  incomeByCategory: CategoryTotal[]
}

export type HoldingKind = 'savings' | 'investment'

/** A savings deposit or investment (`GET /v1/finance/holdings`). Profit = currentValue - principal. */
export interface Holding {
  id: string
  kind: HoldingKind
  name: string
  /** VND put in. */
  principal: number
  /** VND it is worth now (updated by hand). */
  currentValue: number
  /** Percent per year, when there is a fixed rate. */
  annualRate: number | null
  /** ISO date, YYYY-MM-DD. */
  startDate: string
  note: string
}
