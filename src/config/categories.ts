import type { TxType } from '../lib/types'

/** Stored category keys (English). Display names come from the `category.<key>` translations. */
export const categories: Record<TxType, string[]> = {
  expense: ['food', 'transport', 'housing', 'shopping', 'entertainment', 'health', 'education', 'bills', 'gifts', 'other'],
  income: ['salary', 'bonus', 'interest', 'investment', 'gift', 'other'],
}

/**
 * Expense categories that are really transfers into savings / investments (see the Investments tab).
 * They reduce the cash balance but are not spending, so charts and spending totals leave them out.
 */
export const TRANSFER_CATEGORIES = ['savings', 'investment']

/**
 * Income category for money taken back out of a savings / investment holding to use. It adds to the
 * cash balance but is not income, so income totals and charts leave it out (profit is booked as `interest`).
 */
export const WITHDRAWAL = 'withdrawal'

/** Default icon per built-in category key (the user can change them in Settings). */
export const DEFAULT_ICONS: Record<string, string> = {
  food: '🍜',
  transport: '🛵',
  housing: '🏠',
  shopping: '🛍️',
  entertainment: '🎬',
  health: '💊',
  education: '📚',
  bills: '🧾',
  gifts: '🎁',
  other: '📦',
  salary: '💼',
  bonus: '🎉',
  interest: '🏦',
  investment: '📈',
  gift: '🎁',
  savings: '🐷',
  withdrawal: '💸',
  none: '❔',
}

/** Icons offered when picking one for a category, grouped (group names come from `icons.<group>`). */
export const ICON_GROUPS = {
  food: ['🍜', '🍲', '🍚', '🍱', '🍣', '🍕', '🍔', '🍟', '🌮', '🥗', '🥪', '🍗', '🥩', '🍳', '🥐', '🍰', '🍦', '🍩', '🍪', '🍫', '🍎', '🍌', '🥑', '☕', '🧋', '🍵', '🥤', '🍺', '🍷', '🥂', '🛒', '🧺'],
  transport: ['🛵', '🏍️', '🚗', '🚕', '🚌', '🚇', '🚆', '🚲', '🛴', '✈️', '🚢', '⛽', '🅿️', '🔋', '🛞', '🚦', '🗺️', '🧳', '🏨', '🏖️', '⛰️', '🏕️'],
  home: ['🏠', '🏢', '🛋️', '🛏️', '🚿', '🛁', '🧹', '🧺', '🧼', '🪴', '💡', '🔌', '💧', '🔥', '📶', '📺', '🖥️', '🧊', '🔧', '🔨', '🪛', '🔑', '🧾', '📬'],
  shopping: ['🛍️', '👕', '👖', '👗', '👟', '👠', '👜', '🎒', '👓', '⌚', '💍', '💄', '🧴', '💇', '💅', '📱', '💻', '🎧', '📷', '🕹️', '🧸', '🎁'],
  fun: ['🎬', '🍿', '🎮', '🎵', '🎤', '🎸', '🎨', '📖', '🎭', '🎟️', '🎳', '🎯', '⚽', '🏀', '🏸', '🎾', '🏊', '🚴', '🏋️', '🧘', '⛳', '🎲', '🎉', '🎂'],
  health: ['💊', '💉', '🩺', '🏥', '🦷', '👁️', '🩹', '🧠', '❤️', '🧘', '🛡️', '😴'],
  work: ['📚', '🎓', '✏️', '📝', '📒', '🏫', '💼', '🖨️', '📊', '🧑‍💻', '🌐', '☁️', '📦', '✉️'],
  family: ['👶', '🍼', '🧒', '👪', '👵', '💑', '💐', '🐶', '🐱', '🐟', '🐦', '🦴', '🙏', '⛪', '🕯️', '🧧'],
  money: ['💰', '💵', '💳', '🏦', '📈', '📉', '🪙', '💎', '🐷', '🧾', '💸', '🤝', '🏆', '⭐', '🎉', '💼'],
  other: ['📦', '❔', '⚙️', '🔔', '📌', '🏷️', '🔒', '♻️', '🌱', '☀️', '🌧️', '❄️', '🚬', '🍀', '🎗️', '🚩'],
} as const
export type IconGroup = keyof typeof ICON_GROUPS

/** Placeholder for transactions not classified yet (e.g. from the iPhone Shortcut); highlighted in the list. */
export const UNCATEGORIZED = 'none'

/** Vietnamese names written before categories became keys (API rows and the old localStorage import). */
const LEGACY: Record<string, string> = {
  'Ăn uống': 'food',
  'Di chuyển': 'transport',
  'Nhà ở': 'housing',
  'Mua sắm': 'shopping',
  'Giải trí': 'entertainment',
  'Sức khoẻ': 'health',
  'Giáo dục': 'education',
  'Hoá đơn': 'bills',
  Lương: 'salary',
  Thưởng: 'bonus',
  'Đầu tư': 'investment',
  'Quà tặng': 'gift',
  Khác: 'other',
}

/** Category key for a stored value; unknown (custom) values pass through unchanged. */
export const categoryKey = (raw: string) => LEGACY[raw] ?? raw
