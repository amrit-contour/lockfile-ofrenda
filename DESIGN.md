# DESIGN.md

## Visual theme
Black lacquer ledger. Marigold candles. Remembrance typed on a pale slip, not on the whole page.

Scene: a developer at dusk, lockfile as a death register, one gold votive per quiet package.

## Color (OKLCH)
- `--bg`: oklch(0.11 0 0)
- `--surface`: oklch(0.16 0.012 91)
- `--ink`: oklch(0.93 0.02 91)
- `--muted`: oklch(0.72 0.03 91)
- `--primary`: oklch(0.78 0.155 91)
- `--accent`: oklch(0.45 0.14 25)
- `--slip`: oklch(0.96 0.02 95)

Strategy: committed. Marigold carries selection, flames, and the primary action. Accent is only for deprecated / unpublished.

## Typography
- IBM Plex Sans: chrome, body, buttons
- IBM Plex Mono: versions, dates, paths
- Fraunces: offering names and the remembrance title

## Layout
Two columns from 900px: ledger left, slip right. Stack on small screens. No card grid of identical offerings.

## Motion
150–250ms state changes. Flame flicker only on the selected row. Reduced motion: static flame, no flicker.
