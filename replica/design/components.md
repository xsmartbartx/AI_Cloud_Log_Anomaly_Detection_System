# Sentinel components

Design language (original, patterns only): Azure-style app shell (slim top bar, left rail, breadcrumbs, dense tables, status chips) for `/app`; Apple-style marketing (large type, generous whitespace, one idea per section, quiet product imagery) for `/`. Accent is a placeholder teal; replica-brand replaces values, not roles. Icons: Lucide (ISC). Fonts: Inter + JetBrains Mono (OFL).

Layout: marketing content max 1120, app max 1440, rail 240 (56 collapsed), app header 48, marketing header 52. Breakpoints: 640, 768, 1024. Spacing 4-based. Radius 4/8/14. Themes: light, dark, follows system, override via `data-theme`.

All primitives are built in `apps/sentinel-web/components/ui` and shown at `/design`.

Button
  variants  primary, secondary, ghost, danger
  sizes     sm 32, md 40, lg 48
  states    default, hover, focus-visible (2px accent ring), disabled, loading (spinner, label kept, aria-busy)
  a11y      real <button>
  used on   S01 S02 S06 S10 S11 S12

Input / LogArea
  states    default, focus, disabled, error (border danger + message), hint
  a11y      label bound by id, aria-invalid, aria-describedby; LogArea mono 12px, spellcheck off
  used on   S06 S09 S11 S12

SeverityChip
  variants  critical, high, medium, low
  a11y      always a text label; colour pairs pass AA (5.2:1 or better)
  used on   S05 S07 S08

Card / StatTile / QuotaMeter / EmptyState
  states    StatTile loading skeleton; QuotaMeter normal, 80% warn, 100% full + message; EmptyState with action
  a11y      meter is role=progressbar with value, min, max, label
  used on   S05 S10 S08

FindingRow
  states    collapsed (truncated mono line), expanded (wrapped line, line number, reason, detail)
  a11y      button with aria-expanded; keyboard Enter/Space
  used on   S07

Table
  parts     Table, Th (scope=col), Td; horizontal scroll on narrow screens
  states    empty uses EmptyState; loading skeleton rows to add at build
  used on   S05 S08 S11 S12

Modal
  base      native <dialog>: focus trap, Esc, inert background
  used on   S11 (new key), S12 (invite), S10 (plan change)

Alert
  tones     info, error (role=alert), success (role=status)
  used on   S06 S07 S10

To build at screen time: TopNav (marketing), AppShell (top bar + rail + breadcrumbs), PlanCard, PricingTable, Toast, Tabs, Switch, CodeBlock (docs).
