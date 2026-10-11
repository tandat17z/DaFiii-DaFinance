import { useMemo, useState } from 'react'
import { cn } from '../lib/cn'
import { useFormat } from '../lib/format'
import { isClosed } from '../lib/holdings'
import { entryKind, type EntryKind } from '../lib/transfers'
import type { Holding, Transaction } from '../lib/types'
import { useI18n } from '../locales'
import type { MessageKey } from '../locales/en'
import { Card } from './ui'

type Kind = 'in' | 'out' | 'gain'
const KIND_OF: Record<EntryKind, Kind | null> = { deposit: 'in', withdrawal: 'out', gain: 'gain', tx: null }
const KIND: Record<Kind, { label: MessageKey; total: MessageKey; text: string; sign: string }> = {
  in: { label: 'hist.deposit', total: 'hist.total.in', text: 'text-fg', sign: '−' },
  out: { label: 'hist.withdraw', total: 'hist.total.out', text: 'text-cat-2', sign: '+' },
  gain: { label: 'hist.gain', total: 'hist.total.gain', text: 'text-income', sign: '+' },
}

/**
 * Every move between cash and savings / investments, newest first: deposits, withdrawals and the
 * profit taken with them. Rows link to a holding by `holdingId`; older deposits (before the link
 * existed) by their note, which was the holding's name.
 */
export function HoldingHistory({ items, holdings }: { items: Transaction[]; holdings: Holding[] }) {
  const { t } = useI18n()
  const { formatVnd, formatDayHeader } = useFormat()
  const [filter, setFilter] = useState('all')

  const rows = useMemo(() => {
    const byName = new Map(holdings.map((h) => [h.name, h]))
    const byId = new Map(holdings.map((h) => [h.id, h]))
    const out: { tx: Transaction; kind: Kind; holding: Holding | null }[] = []
    for (const tx of items) {
      const kind = KIND_OF[entryKind(tx)]
      if (!kind) continue
      const holding = (tx.holdingId ? byId.get(tx.holdingId) : byName.get(tx.note)) ?? null
      out.push({ tx, kind, holding })
    }
    return out.sort((a, b) => b.tx.date.localeCompare(a.tx.date))
  }, [items, holdings])

  const shown = filter === 'all' ? rows : rows.filter((r) => r.holding?.id === filter)
  const sum = (k: Kind) => shown.reduce((s, r) => s + (r.kind === k ? r.tx.amount : 0), 0)

  return (
    <Card
      title={t('hist.title')}
      action={
        <select className="field h-8 max-w-44 py-0 text-xs" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label={t('hist.filter')}>
          <option value="all">{t('hist.all')}</option>
          {holdings.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
              {isClosed(h) ? ` (${t('wd.closed')})` : ''}
            </option>
          ))}
        </select>
      }
    >
      <dl className="grid grid-cols-3 gap-2 text-xs">
        {(['in', 'out', 'gain'] as const).map((k) => (
          <div key={k} className="rounded-lg border border-border bg-surface-2 px-3 py-2">
            <dt className="text-subtle">{t(KIND[k].total)}</dt>
            <dd className={cn('mt-0.5 font-mono text-sm tabular-nums', KIND[k].text)}>{formatVnd(sum(k))}</dd>
          </div>
        ))}
      </dl>
      {shown.length === 0 ? (
        <p className="py-8 text-center text-sm text-subtle">{t('hist.empty')}</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {shown.map(({ tx, kind, holding }) => (
            <li key={tx.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span className={cn('w-16 shrink-0 rounded-full border px-1.5 py-px text-center text-[10px]', kind === 'in' ? 'border-border-strong text-muted' : kind === 'out' ? 'border-cat-2/40 text-cat-2' : 'border-income/40 text-income')}>{t(KIND[kind].label)}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate">{holding?.name ?? tx.note}</div>
                <div className="truncate text-xs text-subtle">
                  {formatDayHeader(tx.date)}
                  {tx.note && tx.note !== holding?.name && ` · ${tx.note}`}
                </div>
              </div>
              <span className={cn('font-mono whitespace-nowrap tabular-nums', KIND[kind].text)}>
                {KIND[kind].sign}
                {formatVnd(tx.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
