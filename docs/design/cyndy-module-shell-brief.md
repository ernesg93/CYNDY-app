# CYNDY module shell — design brief

**Status:** draft for product review

**Primary viewport:** Android compact (360 px); safe minimum 320 px; validate at 200% zoom.

**Reference:** the provided parallel counter establishes an operational visual direction only. It does not authorize copying its brand, content, or unimplemented features.

## Purpose

Design CYNDY as a focused cash-counter module that can later live inside a separately named parent program. The module must feel complete on its own while exposing a clean visual boundary for a future host workspace.

## Product boundaries

### Future host owns

- Parent-program identity and module switching.
- Any future global workspace navigation or home screen.
- Future global preferences, if the parent program introduces them.

### CYNDY owns

- Its identity as the counter module.
- Internal destinations: **Count**, **History**, and **Settings**.
- Local cash-counting preferences, including currencies and denominations.
- A local theme switcher and ES/EN language switcher for the current product scope.

The current design must not render empty parent-program modules, a fake global drawer, or speculative host navigation.

## Mobile shell

### Header

The top header is compact and contains:

1. CYNDY module mark and current destination context.
2. Theme control with an accessible label and visible state.
3. Language control showing the selected locale (`ES` or `EN`).

These controls require touch targets of at least 44 × 44 CSS px and must remain usable at 200% zoom.

### Internal navigation

Use a bottom navigation bar for the three high-frequency module destinations:

- **Count / Contar**
- **History / Historial**
- **Settings / Ajustes**

The active destination needs text plus an icon or other non-colour cue. On larger viewports, this same information architecture may become a compact horizontal module navigation; route names and ordering do not change.

### Content region

The module content begins below the header and ends above the bottom navigation. It must not hide focused fields, destructive confirmations, or the per-currency sticky totals that existing behavior requires.

## Visual direction

- Operational, quiet, and high-contrast—not a generic form card on an empty canvas.
- Dark theme is the initial direction; light theme is an equal first-class token set.
- One semantic token system controls both themes: canvas, elevated surface, input surface, text, muted text, border, focus, primary action, destructive action, success, and disabled state.
- Numeric totals, denominations, quantities, and subtotals receive the strongest hierarchy.
- Dense data must remain scannable and never depend on colour alone.

## Locale behavior

On first use, select the browser language when supported and fall back to Spanish. A manual `ES` / `EN` choice overrides it and persists only on the current device. Both locales use neutral wording.

This brief does not introduce translation services, accounts, synchronization, or a server dependency.

## Accessibility and behavior invariants

The design must preserve:

- Native number inputs, labels, fieldsets, legends, error associations, keyboard order, skip link, and focus management.
- The non-interactive per-currency sticky total within its own fieldset.
- No horizontal overflow at 200% zoom.
- Minimum interactive targets and visible focus indicators.
- Local-only data, offline shell behavior, print flow, and the existing destructive-action confirmations.
- Separate currency totals; no aggregate converted total.

## OpenPencil working approach

OpenPencil is a design tool, not an application dependency. Its CLI can import HTML/CSS into a design document, inspect tokens, lint a document, and export visual artifacts without a desktop editor session.

The next design artifact will be a versioned mobile shell source mock plus a generated OpenPencil document and exported preview. The source mock is only a prototype input; it does not replace the application's React implementation.

## Review criteria for the next artifact

The mobile shell prototype is ready for review when it shows:

1. A 360 px Android-first frame in both dark and light themes.
2. The ES and EN locale states.
3. Header controls and bottom navigation with a clear active state.
4. A content-safe area for the Count route.
5. A visible separation between CYNDY's module shell and any future parent host.
