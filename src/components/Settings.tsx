import { useEffect, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { LOCALES, type Locale } from '@tada/kit/i18n'
import { ThemePicker } from '@tada/kit/theme'
import { ICON_GROUPS, type IconGroup } from '../config/categories'
import { cn } from '../lib/cn'
import { useFormat } from '../lib/format'
import { useInstall } from '../lib/install'
import { useCategories, useSettings, type Theme } from '../lib/settings'
import type { TxType } from '../lib/types'
import { useI18n } from '../locales'
import { Button } from './ui'

/**
 * Opens the settings drawer: from the account menu's Settings item ("tdz-account:settings"),
 * or, with `button` (standalone, no account menu), from a gear button in the header.
 */
export function SettingsLauncher({ button }: { button?: boolean }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener('tdz-account:settings', onOpen)
    return () => window.removeEventListener('tdz-account:settings', onOpen)
  }, [])
  return (
    <>
      {button && <button
        type="button"
        aria-label={t('settings.open')}
        title={t('settings.open')}
        onClick={() => setOpen(true)}
        className="grid size-8 place-items-center rounded-full border border-border-strong bg-surface-2 text-muted transition-colors hover:text-fg"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
        </svg>
      </button>}
      {open && <SettingsPanel onClose={() => setOpen(false)} />}
    </>
  )
}

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { t, locale, setLocale } = useI18n()
  const { settings, update } = useSettings()
  const { formatVnd } = useFormat()
  const cats = useCategories()
  const [type, setType] = useState<TxType>('expense')
  const app = useInstall()

  useEffect(() => {
    // Escape in a field (e.g. while renaming) cancels the edit, not the whole drawer.
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !(e.target instanceof HTMLInputElement) && onClose()
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  const setTheme = (theme: Theme) => update((s) => ({ ...s, theme }))
  const totalBudget = cats.expense.reduce((sum, k) => sum + cats.budgetOf(k), 0)

  return createPortal(
    <>
      <div aria-hidden="true" onClick={onClose} className="fixed inset-0 z-40 bg-black/50" />
      <aside role="dialog" aria-modal="true" aria-label={t('settings.title')} className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border-strong bg-surface shadow-2xl shadow-black/40">
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight">{t('settings.title')}</h2>
            <p className="text-xs text-subtle">{t('settings.local')}</p>
          </div>
          <button type="button" autoFocus onClick={onClose} aria-label={t('settings.close')} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg">
            ✕
          </button>
        </header>

        <div className="grid flex-1 content-start gap-7 overflow-y-auto px-5 py-5 [scrollbar-width:thin]">
          <section className="grid gap-3">
            <h3 className="font-mono text-[11px] tracking-wider text-subtle uppercase">{t('lang.label')}</h3>
            <div role="radiogroup" aria-label={t('lang.label')} className="grid grid-cols-2 gap-2">
              {(Object.keys(LOCALES) as Locale[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  role="radio"
                  aria-checked={locale === l}
                  onClick={() => setLocale(l)}
                  className={cn('flex items-center gap-3 rounded-xl border p-3 text-left text-sm transition-colors', locale === l ? 'border-accent bg-accent/10' : 'border-border hover:border-border-strong')}
                >
                  <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-surface-2 font-mono text-xs font-semibold">
                    {LOCALES[l].code}
                  </span>
                  {LOCALES[l].label}
                </button>
              ))}
            </div>
          </section>


          <section className="grid gap-3">
            <h3 className="font-mono text-[11px] tracking-wider text-subtle uppercase">{t('install.title')}</h3>
            {app.state === 'ready'
              ? <Button variant="primary" onClick={app.install}>⤓ {t('install.button')}</Button>
              : <p className="text-sm text-muted">{t(app.state === 'installed' ? 'install.done' : app.state === 'ios' ? 'install.ios' : 'install.manual')}</p>}
          </section>

          <ThemePicker value={settings.theme} onChange={setTheme} locale={locale} />

          <section className="grid gap-3">
            <h3 className="font-mono text-[11px] tracking-wider text-subtle uppercase">{t('settings.categories')}</h3>
            <div className="flex flex-wrap items-center justify-between gap-2">
            <div role="radiogroup" className="flex w-fit rounded-lg border border-border bg-surface-2 p-0.5">
              {(['expense', 'income'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={type === k}
                  onClick={() => setType(k)}
                  className={cn('rounded-md px-3 py-1 text-xs transition-colors', type === k ? (k === 'expense' ? 'bg-expense/15 text-expense' : 'bg-income/15 text-income') : 'text-muted hover:text-fg')}
                >
                  {t(k === 'expense' ? 'tile.expense' : 'tile.income')}
                </button>
              ))}
            </div>
              {type === 'expense' && totalBudget > 0 && <span className="font-mono text-xs text-muted">{t('settings.budgetTotal', { amount: formatVnd(totalBudget) })}</span>}
            </div>
            <p className="text-xs text-subtle">{t(type === 'expense' ? 'settings.budgetHint' : 'settings.renameHint')}</p>
            {type === 'expense' && (
              <div className="-mb-1.5 flex justify-between px-2 font-mono text-[10px] tracking-wider text-subtle uppercase">
                <span>{t('form.category')}</span>
                <span className="mr-9 w-28 text-right">{t('settings.budget')}</span>
              </div>
            )}
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              {cats[type].map((key) => (
                <CategoryRow key={key} catKey={key} type={type} />
              ))}
            </ul>
            <AddCategory type={type} />
            <Removed type={type} />
          </section>
        </div>
      </aside>
    </>,
    document.body,
  )
}

function CategoryRow({ catKey, type }: { catKey: string; type: TxType }) {
  const { t } = useI18n()
  const { update } = useSettings()
  const { categoryName, formatShortVnd } = useFormat()
  const cats = useCategories()
  const [renaming, setRenaming] = useState(false)
  const isCustom = cats.isCustom(catKey)
  const name = categoryName(catKey)
  const budget = cats.budgetOf(catKey)

  const setIcon = (icon: string) => {
    update((s) => (isCustom ? { ...s, custom: s.custom.map((c) => (c.key === catKey ? { ...c, icon } : c)) } : { ...s, icons: { ...s.icons, [catKey]: icon } }))
  }
  /** Saves a new name; an empty name puts a built-in category back to its translated name. */
  const rename = (raw: string) => {
    setRenaming(false)
    const next = raw.trim()
    if (next === name) return
    update((s) => {
      if (isCustom) return next ? { ...s, custom: s.custom.map((c) => (c.key === catKey ? { ...c, name: next } : c)) } : s
      const names = { ...s.names }
      if (next) names[catKey] = next
      else delete names[catKey]
      return { ...s, names }
    })
  }
  const setBudget = (raw: string) => {
    const n = Math.max(0, Math.round(Number(raw) || 0))
    update((s) => {
      const budgets = { ...s.budgets }
      if (n > 0) budgets[catKey] = n
      else delete budgets[catKey]
      return { ...s, budgets }
    })
  }
  const remove = () =>
    update((s) => {
      const budgets = { ...s.budgets }
      delete budgets[catKey]
      // A user category is deleted; a built-in one is only hidden, so it can be restored.
      return isCustom ? { ...s, budgets, custom: s.custom.filter((c) => c.key !== catKey) } : { ...s, budgets, hidden: [...s.hidden, `${type}:${catKey}`] }
    })

  return (
    <li className="group">
      <div className="flex items-center gap-2.5 py-1.5 pr-1.5 pl-2">
        <IconPicker value={cats.iconOf(catKey)} label={t('settings.pickIcon', { name })} onPick={setIcon} />
        {renaming ? (
          <input
            autoFocus
            className="field min-w-0 flex-1 px-2 py-1 text-sm"
            maxLength={40}
            defaultValue={name}
            aria-label={t('settings.rename', { name })}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={(e) => rename(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
              if (e.key === 'Escape') {
                e.stopPropagation()
                e.currentTarget.value = name
                e.currentTarget.blur()
              }
            }}
          />
        ) : (
          <span onDoubleClick={() => setRenaming(true)} title={t('settings.renameHint')} className="flex min-w-0 flex-1 cursor-text items-center gap-1.5 rounded px-1 py-1 text-sm select-none hover:bg-surface-2">
            <span className="truncate">{name}</span>
            {isCustom && <span className="shrink-0 rounded-full bg-accent/10 px-1.5 py-px text-[10px] text-accent">{t('settings.custom')}</span>}
            <button
              type="button"
              onClick={() => setRenaming(true)}
              aria-label={t('settings.rename', { name })}
              title={t('settings.rename', { name })}
              className="ml-auto grid size-6 shrink-0 place-items-center rounded text-subtle opacity-0 transition group-hover:opacity-100 hover:text-fg focus-visible:opacity-100 [@media(pointer:coarse)]:opacity-100"
            >
              <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </button>
          </span>
        )}
        {type === 'expense' && (
          <label className="relative w-28 shrink-0">
            <span className="sr-only">{t('settings.budget')}</span>
            <input
              className="w-full rounded-md border border-transparent bg-surface-2/70 py-1 pr-9 pl-2 text-right font-mono text-xs text-fg placeholder:text-subtle hover:border-border focus:border-border-strong focus:outline-none max-sm:text-base"
              type="number"
              inputMode="numeric"
              min={0}
              step={100000}
              placeholder="—"
              title={budget ? undefined : t('settings.noLimit')}
              defaultValue={budget || ''}
              onBlur={(e) => setBudget(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            />
            <span className={cn('pointer-events-none absolute inset-y-0 right-2 flex items-center font-mono text-[10px]', budget > 0 ? 'text-accent' : 'text-subtle')}>{budget > 0 ? formatShortVnd(budget) : '₫'}</span>
          </label>
        )}
        <button
          type="button"
          onClick={remove}
          aria-label={t('settings.delete', { name })}
          title={t(isCustom ? 'settings.deleteHint' : 'settings.hideHint')}
          className="grid size-7 shrink-0 place-items-center rounded-md text-xs text-subtle opacity-0 transition group-hover:opacity-100 hover:bg-expense/10 hover:text-expense focus-visible:opacity-100 [@media(pointer:coarse)]:opacity-100"
        >
          ✕
        </button>
      </div>
    </li>
  )
}

/** Built-in categories the user removed, one tap to bring each back. */
function Removed({ type }: { type: TxType }) {
  const { t } = useI18n()
  const { update } = useSettings()
  const { categoryName } = useFormat()
  const cats = useCategories()
  const removed = cats.removed(type)
  if (removed.length === 0) return null
  return (
    <div className="grid gap-2">
      <p className="text-xs text-subtle">{t('settings.removed')}</p>
      <div className="flex flex-wrap gap-1.5">
        {removed.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => update((s) => ({ ...s, hidden: s.hidden.filter((h) => h !== `${type}:${key}`) }))}
            aria-label={t('settings.restore', { name: categoryName(key) })}
            className="flex items-center gap-1.5 rounded-full border border-border-strong px-2.5 py-1 text-xs text-muted transition-colors hover:border-accent/60 hover:text-fg"
          >
            <span aria-hidden="true">{cats.iconOf(key)}</span>
            {categoryName(key)}
            <span aria-hidden="true" className="text-accent">↺</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Icon button that opens the icon picker in a floating bubble (portal, fixed to the viewport) next to
 * it, so the list layout does not move. Follows the button when the drawer scrolls; closes on pick,
 * outside click, Escape, resize, or when the button scrolls out of view.
 */
function IconPicker({ value, label, onPick, className }: { value: string; label: string; onPick: (icon: string) => void; className?: string }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [group, setGroup] = useState<IconGroup>('food')
  const [pos, setPos] = useState({ top: 0, left: 0, width: 320 })
  const anchor = useRef<HTMLButtonElement>(null)
  const bubble = useRef<HTMLDivElement>(null)

  /** Places the bubble under the button (above when there is no room), inside the viewport. False when the button is off screen. */
  const place = () => {
    if (!anchor.current) return false
    const r = anchor.current.getBoundingClientRect()
    if (r.bottom < 0 || r.top > window.innerHeight) return false
    const width = Math.min(340, window.innerWidth - 16)
    const height = bubble.current?.offsetHeight ?? 260
    const top = window.innerHeight - r.bottom < height + 12 ? Math.max(8, r.top - height - 6) : r.bottom + 6
    setPos({ top, left: Math.min(Math.max(8, r.left), window.innerWidth - width - 8), width })
    return true
  }

  useEffect(() => {
    if (!open) return
    const inside = (e: Event) => e.target instanceof Node && (bubble.current?.contains(e.target) || anchor.current?.contains(e.target))
    const onDown = (e: PointerEvent) => !inside(e) && setOpen(false)
    // Capture phase on window, so Escape closes only the bubble and not the settings drawer behind it.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setOpen(false)
      anchor.current?.focus()
    }
    const onScroll = (e: Event) => {
      if (e.target instanceof Node && bubble.current?.contains(e.target)) return
      if (!place()) setOpen(false)
    }
    const onResize = () => setOpen(false)
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
    // place() only reads refs and sets state.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const toggle = () => {
    if (!open) place()
    setOpen((o) => !o)
  }

  return (
    <>
      <button
        ref={anchor}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label}
        onClick={toggle}
        className={cn('grid size-8 shrink-0 place-items-center rounded-lg text-base transition-colors', open ? 'bg-accent/15 ring-1 ring-accent/50' : 'bg-surface-2 hover:bg-border', className)}
      >
        {value}
      </button>
      {open &&
        createPortal(
          <div ref={bubble} role="dialog" aria-label={label} style={pos} className="fixed z-[60] grid gap-2 rounded-xl border border-border-strong bg-surface p-2 shadow-xl shadow-black/30">
            <div role="tablist" className="-mx-2 flex gap-1 overflow-x-auto px-2 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {(Object.keys(ICON_GROUPS) as IconGroup[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  role="tab"
                  aria-selected={group === g}
                  onClick={() => setGroup(g)}
                  className={cn('flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs whitespace-nowrap transition-colors', group === g ? 'border-accent/60 bg-accent/10 text-fg' : 'border-border text-muted hover:text-fg')}
                >
                  <span aria-hidden="true">{ICON_GROUPS[g][0]}</span>
                  {t(`icons.${g}`)}
                </button>
              ))}
            </div>
            <div className="grid max-h-52 grid-cols-8 gap-0.5 overflow-y-auto [scrollbar-width:thin]">
              {ICON_GROUPS[group].map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => {
                    onPick(icon)
                    setOpen(false)
                  }}
                  className={cn('grid aspect-square place-items-center rounded-md text-xl transition-colors hover:bg-surface-2', icon === value && 'bg-accent/15 ring-1 ring-accent/50')}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

function AddCategory({ type }: { type: TxType }) {
  const { t } = useI18n()
  const { update } = useSettings()
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📦')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    update((s) => ({ ...s, custom: [...s.custom, { key: `c-${crypto.randomUUID().slice(0, 8)}`, type, name: trimmed, icon }] }))
    setName('')
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-dashed border-border-strong">
      <div className="flex items-center gap-2.5 p-2">
        <IconPicker value={icon} label={t('settings.pickIcon', { name: name || t('settings.newName') })} onPick={setIcon} className="size-9 text-lg" />
        <input className="field min-w-0 flex-1 py-1.5" maxLength={40} placeholder={t('settings.newName')} aria-label={t('settings.newName')} value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" variant="primary" className="shrink-0 px-3 py-1.5" disabled={!name.trim()}>
          + {t('settings.add')}
        </Button>
      </div>
    </form>
  )
}
