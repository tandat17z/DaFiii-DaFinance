import { categoryKey, TRANSFER_CATEGORIES, WITHDRAWAL } from '../config/categories'
import type { Transaction } from './types'

/** Money moved into savings / investments: leaves the cash balance, but is not spending. */
export const isTransferOut = (tx: Transaction) => tx.type === 'expense' && TRANSFER_CATEGORIES.includes(categoryKey(tx.category))

/** Money taken back out of savings / investments to use: adds to the cash balance, but is not income. */
export const isTransferIn = (tx: Transaction) => tx.type === 'income' && categoryKey(tx.category) === WITHDRAWAL

/** Either direction of a move between cash and savings / investments. */
export const isTransfer = (tx: Transaction) => isTransferOut(tx) || isTransferIn(tx)

/** Real spending: expenses that are not transfers. */
export const isSpending = (tx: Transaction) => tx.type === 'expense' && !isTransferOut(tx)

/** Real income: income that is not money taken back from savings / investments. */
export const isEarning = (tx: Transaction) => tx.type === 'income' && !isTransferIn(tx)

/** Effect on the cash balance: + for income and withdrawals, − for spending and deposits. */
export const cashEffect = (tx: Transaction) => (tx.type === 'income' ? tx.amount : -tx.amount)

/** What an entry is, which decides the fields it is edited with. */
export type EntryKind = 'tx' | 'deposit' | 'withdrawal' | 'gain'

/**
 * `deposit`: put into a holding; `withdrawal`: taken back out to cash; `gain`: the profit taken with a
 * withdrawal (interest income linked to a holding); `tx`: an ordinary income or expense.
 */
export const entryKind = (tx: Transaction): EntryKind =>
  isTransferOut(tx) ? 'deposit' : isTransferIn(tx) ? 'withdrawal' : tx.holdingId && tx.type === 'income' && categoryKey(tx.category) === 'interest' ? 'gain' : 'tx'
