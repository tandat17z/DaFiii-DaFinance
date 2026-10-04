import { applyTheme, type Theme } from '@tada/kit/theme'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { categories, categoryKey, DEFAULT_ICONS, TRANSFER_CATEGORIES } from '../config/categories'
import type { TxType } from './types'

export type { Theme }

/** A category the user added. `key` is stored on transactions; `name` is shown as typed (never translated). */
export interface CustomCategory {
  key: string
  type: TxType
  name: string
  icon: string
}


/**
 * Preferences: kept in this browser, and synced to the API (`/settings`) when data lives on the server
 * (components/SettingsSync.tsx).
 * `budgets`: monthly spending limit in VND per expense category key.
 * `names`: names the user gave to built-in categories (shown as typed).
 * `hidden`: built-in categories the user removed, as `<type>:<key>` (`other` exists for both types);
 * left out of pickers, existing entries keep them.
 */
export interface Settings {
  theme: Theme
  custom: CustomCategory[]
  icons: Record<string, string>
  budgets: Record<string, number>
  hidden: string[]
  names: Record<string, string>
}

const KEY = 'dafinance.settings'
const DEFAULTS: Settings = { theme: 'dark', custom: [], icons: {}, budgets: {}, hidden: [], names: {} }

/** A stored settings document with defaults for missing fields. */
export const withDefaults = (s: Partial<Settings>): Settings => ({ ...DEFAULTS, ...s })

function read(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

type Ctx = { settings: Settings; update: (patch: (s: Settings) => Settings) => void }
const SettingsContext = createContext<Ctx>({ settings: DEFAULTS, update: () => {} })

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(read)

  useEffect(() => {
    applyTheme(settings.theme)
    try {
      localStorage.setItem(KEY, JSON.stringify(settings))
    } catch {
      // Not persisted; applies for this visit.
    }
  }, [settings])

  const update = useCallback((patch: (s: Settings) => Settings) => setSettings(patch), [])
  return <SettingsContext.Provider value={{ settings, update }}>{children}</SettingsContext.Provider>
}

export const useSettings = () => useContext(SettingsContext)

/** Category keys per type (built-in minus the removed ones, then the user's), icons and custom names. */
export function useCategories() {
  const { settings } = useSettings()
  return useMemo(() => {
    const extra = (type: TxType) => settings.custom.filter((c) => c.type === type).map((c) => c.key)
    const byKey = new Map(settings.custom.map((c) => [c.key, c]))
    const builtIn = (type: TxType) => categories[type].filter((k) => !settings.hidden.includes(`${type}:${k}`))
    return {
      expense: [...builtIn('expense'), ...extra('expense')],
      income: [...builtIn('income'), ...extra('income')],
      /** Expense choices in pickers: spending categories plus transfers into savings / investments. */
      expenseWithTransfers: [...builtIn('expense'), ...extra('expense'), ...TRANSFER_CATEGORIES],
      /** Built-in categories the user removed, to offer restoring them. */
      removed: (type: TxType) => categories[type].filter((k) => settings.hidden.includes(`${type}:${k}`)),
      iconOf: (raw: string) => {
        const key = categoryKey(raw)
        return settings.icons[key] ?? byKey.get(key)?.icon ?? DEFAULT_ICONS[key] ?? '•'
      },
      /** Name typed by the user (their category, or a renamed built-in one); undefined = translated name. */
      customName: (raw: string) => settings.names[categoryKey(raw)] ?? byKey.get(categoryKey(raw))?.name,
      isCustom: (raw: string) => byKey.has(categoryKey(raw)),
      budgetOf: (raw: string) => settings.budgets[categoryKey(raw)] ?? 0,
    }
  }, [settings])
}
