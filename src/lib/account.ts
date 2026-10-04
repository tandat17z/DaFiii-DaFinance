// The caller's account in this app (`/v1/finance/account`). Types, context and the gate live in
// @tada/kit/account; this file only binds them to the finance API.
import type { Account } from '@tada/kit/account'
import { apiFetch } from './api'

export { ACCOUNT_CHANGED_EVENT, type Account, openStorageRequest, type StorageMode, useAccount } from '@tada/kit/account'

export const fetchAccount = () => apiFetch<Account>('/account')
