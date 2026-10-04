# Changelog

All notable changes to DaFinance. Newest first. The in-app version dialog reads the same list from
`src/config/changelog.ts` (English and Vietnamese) — update both on every release.

## 1.3.2 — 2026-10-04

### Changed
- New logo mark (icon and short name on a tinted tile) and the shared page layout, from `@tada/kit`
  v0.3.0; the appearance picker is the kit's too.
- New home-screen icon; the installed app is named DaFinance.
- Removed the linked-email section from Settings (links are approved by the owner in the hub).

## 1.3.0 — 2026-10-04

### Added
- Switch language right from the account menu (EN / VI), without reloading the page. Settings
  keeps its language picker too.

### Changed
- `@tada/kit` v0.2.0.

## 1.2.0 — 2026-10-04

### Added
- Rate the app and send feedback from the account menu: stars (5 by default), a message or a
  request, with a thank-you popup. The owner is told on Telegram.
- Requests from the account menu, always available: a short note is required; while your data is
  still in the browser each request also asks for server storage, and an optional email to sync
  with links your accounts. Asking again updates a pending request, with no waiting time.
- "About the author" link in the account menu.

### Changed
- "Ask for server storage" (banner or menu) opens that request form in the account menu; the
  banner no longer has its own message box. Once your data is on the server, the form only rates
  and sends messages.

## 1.1.0 — 2026-10-03

### Added
- Settings: light theme, your own categories with icons, a monthly budget per category with an
  over-budget alert. Kept on the server with your data, so every device shares them.
- Quick math in the amount field, with calculator keys.
- Install as an app on Android and desktop.
- Link another sign-in email to your account and see the same data.

### Changed
- People already approved keep using the app when it is private; others see nothing.

## 1.0.0 — 2026-10-03

First public release.

### Added
- Income and spending by category: quick add form (amount, category, date, time, note, optional
  "for month"), searchable list grouped by day, inline edit / delete, CSV export.
- Monthly view and statistics: savings rate, spending by weekday / week / month, heat-map
  calendar, category breakdown (ranked bars + donut).
- Savings and investments, with total assets and profit.
- Runs without an account: `npm run dev` / `npm run build:standalone` keep everything in the
  browser. Hosted with the companion API, approved users store data on the server; others keep it
  in the browser and can ask for server storage from the banner or the account menu.
- iPhone Shortcut to log a payment from a bank receipt screen (on-device OCR). See
  [docs/iphone-shortcut.md](docs/iphone-shortcut.md).
- Vietnamese and English, dark theme, phone and desktop layouts.
