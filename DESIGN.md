---
name: LodgeCal
description: A warm, paper-ledger admin dashboard for tracking a Masonic Lodge's Brothers, households, and dates
colors:
  aged-brass: "#8b4513"
  aged-brass-hover: "#6e3610"
  brass-text: "#fff8ee"
  parchment: "#f4efe6"
  parchment-elevated: "#fbf7f0"
  parchment-muted: "#ebe3d4"
  ledger-surface: "#fffdf8"
  ink: "#2a2118"
  ink-muted: "#6b5b4a"
  border-tan: "#d9ccb6"
  danger: "#8a2b2b"
  danger-bg: "#f8eaea"
  success: "#2f5d3a"
  focus-blue: "#1f4b73"
  day-sheet-bg: "#ffffff"
  relation-female-bg: "#f4d8e3"
  relation-female-text: "#7b2948"
  relation-male-bg: "#d6e7f5"
  relation-male-text: "#245578"
  relation-neutral-bg: "#e7e0d4"
  relation-neutral-text: "#5d4c38"
typography:
  display:
    fontFamily: "Source Serif 4, Iowan Old Style, Palatino Linotype, Palatino, Book Antiqua, Georgia, serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.25
  headline:
    fontFamily: "Source Serif 4, Iowan Old Style, Palatino Linotype, Palatino, Book Antiqua, Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.25
  title:
    fontFamily: "Source Serif 4, Iowan Old Style, Palatino Linotype, Palatino, Book Antiqua, Georgia, serif"
    fontSize: "1.2rem"
    fontWeight: 400
  body:
    fontFamily: "Source Sans 3, Segoe UI, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  button:
    fontFamily: "Source Sans 3, Segoe UI, system-ui, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 400
  label:
    fontFamily: "Source Sans 3, Segoe UI, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.08em"
  field-label:
    fontFamily: "Source Sans 3, Segoe UI, system-ui, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 600
  table-label:
    fontFamily: "Source Sans 3, Segoe UI, system-ui, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 700
    letterSpacing: "0.04em"
  mono:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.85em"
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  pill: "999px"
  full: "50%"
spacing:
  xs: "0.35rem"
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1.25rem"
  xl: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.aged-brass}"
    textColor: "{colors.brass-text}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 0.95rem"
  button-primary-hover:
    backgroundColor: "{colors.aged-brass-hover}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.aged-brass}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 0.95rem"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "0.5rem 0.95rem"
  card:
    backgroundColor: "{colors.ledger-surface}"
    rounded: "{rounded.md}"
    padding: "1.5rem"
  input:
    backgroundColor: "{colors.ledger-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 0.65rem"
  nav-link-active:
    backgroundColor: "{colors.parchment-muted}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
---

# Design System: LodgeCal

## Overview

**Creative North Star: "The Lodge Ledger"**

LodgeCal replaces a Lodge's birthday/event spreadsheet, and it looks the part: a warm, paper-toned record book rather than a cold SaaS dashboard. The mood is quiet utility, warmed up — the interface is fundamentally a plain admin tool (tables, forms, a sidebar), but every default that would normally default to gray-on-white or Inter-on-blue instead defaults to parchment, ink, and a single restrained brass accent. Nothing here is decorative for its own sake; the warmth comes from material choice, not ornament.

A serif (Source Serif 4) marks headings, the brand name, and headline numbers with the gravity of a bound register, while a plain sans (Source Sans 3) carries every working surface — forms, tables, buttons — so day-to-day admin work stays legible and unfussy. One accent color, Aged Brass, is spent only on primary actions, links, and calendar-day numbers; it is never used to decorate chrome. Depth is structural rather than reactive: every card, panel, table, and modal carries the same soft ambient shadow at rest, so nothing on the page reads as flat, and nothing needs to "pop" on hover to earn its shadow.

Confirmed visual rejections: no gradients beyond one subtle radial wash behind the auth screens, no glassmorphism or blur effects, no second accent color, no bright/saturated palette, and no default cold-gray or Inter-on-blue SaaS look.

**Key Characteristics:**
- Warm parchment/paper palette with a single restrained brass accent, spent only on actions, links, and dates
- Serif headings (Source Serif 4) paired with a plain sans body (Source Sans 3) — a ledger pairing, not a marketing pairing
- Structural, ambient elevation: every card, panel, table, and modal is consistently "raised," never flat, never dramatically lifted on hover
- A quiet, hand-rolled icon set (18 glyphs, one consistent stroke weight) instead of an off-the-shelf icon library
- One signature motif — the torn desk-calendar "day sheet" — used for every upcoming birthday/event row
- Full light/dark theming via CSS custom properties, toggle persisted per browser

## Colors

A single warm neutral family — parchment paper tones running from a near-white ledger surface to deep ink text — carries the whole interface. One brass accent is spent sparingly on actions and dates; three semantic colors (danger, success, focus) exist purely to signal state, never to decorate.

### Primary
- **Aged Brass** (`#8b4513` light / `#c4a574` dark): the single accent. Used on primary buttons, links, and the calendar-day number — reserved for actions and dates, nowhere else. Hover state deepens to `#6e3610` light / lightens to `#d4b98a` dark.
- **Brass Text** (`#fff8ee` light / `#1c1814` dark): the label/icon color placed on top of a solid Aged Brass fill.

### Neutral
- **Parchment** (`#f4efe6` light / `#1c1814` dark): the page background.
- **Parchment Elevated** (`#fbf7f0` light / `#241f1a` dark): the sidebar background — one step apart from the page.
- **Parchment Muted** (`#ebe3d4` light / `#2c261f` dark): hover/active fill for nav links and table header rows.
- **Ledger Surface** (`#fffdf8` light / `#2a241e` dark): the "paper" surface for cards, panels, inputs, tables, and modals.
- **Ink** (`#2a2118` light / `#f3eadc` dark): primary text.
- **Ink Muted** (`#6b5b4a` light / `#b7a894` dark): secondary and meta text — dates, hints, field labels.
- **Border Tan** (`#d9ccb6` light / `#4a4034` dark): every hairline border and divider.

### Semantic
- **Danger** (`#8a2b2b` light / `#e08a8a` dark) with **Danger Bg** (`#f8eaea` light / `#3a2424` dark): destructive actions and error banners.
- **Success** (`#2f5d3a` light / `#8fbf9a` dark): reserved for confirmation states.
- **Focus Blue** (`#1f4b73` light / `#8cb4d4` dark): the universal `:focus-visible` outline. Deliberately a cool blue, distinct from the warm brass accent, so keyboard focus is never mistaken for hover/active accent styling.

### Relation Pills (fixed, theme-independent)
Family-relationship badges (Mother/Father/Spouse/Child, etc.) use their own constant palette, unaffected by light/dark mode — a deliberate exception to the token system, not a gap:
- **Female** — background `#f4d8e3`, text `#7b2948`.
- **Male** — background `#d6e7f5`, text `#245578`.
- **Household / other** (spouse, child, parent, sibling) — background `#e7e0d4`, text `#5d4c38`.

### Named Rules
**The One Accent Rule.** Brass is spent only on primary actions, links, and calendar-day numbers. Every other hover/active state — including on structural chrome like the sidebar — resolves in the parchment/ink neutral family, never a second brand color.

## Typography

**Display Font:** Source Serif 4 (with Iowan Old Style, Palatino Linotype, Palatino, Book Antiqua, Georgia, serif fallback)
**Body Font:** Source Sans 3 (with Segoe UI, system-ui, sans-serif fallback)
**Label/Mono Font:** IBM Plex Mono (ui-monospace, monospace) — used only for inline `<code>`, never decoratively.

**Character:** A ledger pairing, not a marketing pairing: the serif gives headings, section titles, and the dashboard's headline numbers a bound-record-book gravity, while the plain sans carries every working surface so daily admin stays legible and unfussy.

### Hierarchy
- **Display** (600, 1.75rem, line-height 1.25): h1 page titles and the dashboard stat numbers (`.stat-n`) — the two places a number or title reads as the headline of the screen.
- **Headline** (600, 1.25rem, line-height 1.25): h2 section titles — panel headings, modal headings.
- **Title** (400, 1.2rem, Source Serif 4): the sidebar brand/lodge name. Serif, but not bold — a quieter weight than the headings it sits above in the visual hierarchy.
- **Body** (400, 1rem, line-height 1.5): all running text, form fields, table cells.
- **Button** (400, 0.95rem): button labels — one step down from body, never bold.
- **Label** (600, 0.75rem, uppercase, 0.08em tracking): nav-group headers (`.nav-label`).
- **Field Label** (600, 0.85rem, sentence case): form field labels (`<label>`), and reused as-is for the knowledge table's column headers.
- **Table Label** (700 — the browser's default `<th>` weight, never overridden — 0.8rem, uppercase, 0.04em tracking): standard table column headers and `.brand-sub` (the Obedience line under the Lodge name).

### Named Rules
**The Two-Voice Rule.** Only headings, section titles, the brand name, and the dashboard's headline numbers ever use the serif. Every control, every table cell, every piece of body copy stays in Source Sans 3 — the serif marks "this is a heading," never "this is important."

## Layout

A single-column content area caps at 1280px (`--app-max-width`), centered next to a persistent 16.5rem (264px) sidebar on desktop. The sidebar collapses to a 4.25rem icon rail (labels hidden) via a manual toggle, and below 800px becomes an off-canvas drawer — fixed, sliding in from the left over a warm-tinted scrim, opened by a "Menu" button. The base spacing rhythm is fairly tight — 0.35–0.5rem gaps inside components, 0.75–1.25rem between related elements, 1.25–1.5rem between sections or cards — appropriate for a dense admin dashboard rather than airy marketing whitespace. Two-column form grids (`.field-grid`, `.profile-fields`) collapse to one column between 640–720px. The root font-size is 16px with a 1.5 line-height as the page default.

## Elevation & Depth

Depth is structural and consistent, not state-based: every card, panel, table, and modal carries the same soft two-layer ambient shadow at rest. There is no separate hover-elevation system, and nothing on the page is flat by default. The modal layer alone gets a heavier, dedicated shadow so it reads clearly as sitting above everything else.

### Shadow Vocabulary
- **Ambient** (`0 1px 2px rgba(42,33,24,.08), 0 8px 24px rgba(42,33,24,.06)` light / `0 1px 2px rgba(0,0,0,.35), 0 8px 24px rgba(0,0,0,.28)` dark): the default and only elevation for cards, panels, and the mobile sidebar drawer.
- **Modal** (`0 1rem 3rem rgba(42,33,24,.22)`): reserved for the `<dialog>` layer, paired with a warm-tinted backdrop (`rgba(42,33,24,.42)`) rather than pure black. The mobile off-canvas drawer's scrim shares this same backdrop value — one "dim what's behind" token, not two.
- **Day-sheet edge** (`0 1px 0 var(--border)`): a 1px hairline under the calendar "day sheet," suggesting a torn paper edge rather than a cast shadow.

### Named Rules
**The Structural Shadow Rule.** Every surface is raised by the same amount, always. Depth communicates "this is a distinct block of content," not "this is currently focused" — hover and active states change color or border, never shadow.

## Shapes

Two radius values carry nearly everything: a smaller 6px for anything you interact with directly (buttons, inputs, sidebar links, family-member rows), and a slightly larger 8px for the static containers that hold that content (cards, panels, tables, modal dialogs). Pills and badges (relation tags, status badges) go fully round at 999px; icon buttons are perfect circles at 50%. The one exception is the calendar "day sheet," which rounds tighter at 4px to read as a small physical card rather than a UI control.

### Named Rules
**The Two-Tier Radius Rule.** 6px for controls, 8px for containers, 999px for pills, 50% for icon circles, 4px only for the day-sheet motif. No fifth value.

## Components

### Buttons
- **Shape:** 6px radius, 1px solid border matching the fill color.
- **Primary:** solid Aged Brass fill, Brass Text label, `0.5rem 0.95rem` padding, 2.5rem min-height.
- **Hover / Active:** fill shifts to Aged Brass Hover on hover; active press shifts the button `translateY(1px)` — a small physical response rather than a color-only change.
- **Secondary / Ghost:** transparent fill, Aged Brass text and border — used for cancel/toggle actions (theme toggle, sidebar collapse, the mobile menu button).
- **Danger:** solid Danger fill, white text — reserved for destructive confirmations inside modals.
- **Icon buttons:** circular (50% radius), 2.25rem square by default, 2rem in dense table row-actions; transparent at rest, filling with Parchment Muted on hover (Danger Bg for the destructive variant).

### Chips / Pills
- **Relation pills:** fully round (999px), fixed rose/blue/tan-by-relation palette (see Colors → Relation Pills), constant across both themes.
- **Status badges** (e.g. "Inactive"): outlined (1px Border Tan), fully round, uppercase Danger-colored text.

### Cards / Containers
- **Corner Style:** 8px radius.
- **Background:** Ledger Surface, 1px Border Tan.
- **Shadow Strategy:** the ambient shadow, always on — see Elevation & Depth.
- **Internal Padding:** 1–1.5rem depending on density; dashboard stat cards run tighter, forms run looser.

### Inputs / Fields
- **Style:** Ledger Surface background, 1px Border Tan border, 6px radius, 2.5rem min-height.
- **Focus:** the shared `:focus-visible` treatment — 2px Focus Blue outline, 2px offset — applied to every focusable element, not just inputs.
- **Labels:** sit above the field, sentence case, 0.85rem, 600 weight, Ink Muted.

### Navigation
- **Style:** 16.5rem sidebar, Parchment Elevated background, right border, icon+label link rows.
- **Active / Hover:** fills with Parchment Muted — deliberately not the accent color, so Aged Brass stays reserved for actions and dates rather than wayfinding.
- **Collapsed:** an icon-only rail (4.25rem), labels hidden, links center on the icon.
- **Mobile** (<800px): off-canvas drawer sliding in over a warm-tinted scrim, opened by a "Menu" button; closes on Escape or a scrim tap.

### The Day Sheet (signature component)
The recurring visual anchor of the app: every upcoming birthday/event row leads with a small torn-calendar-page block — a Day-Sheet Bg square, 4px radius, the day number set in Source Serif 4 / Aged Brass over a small uppercase month abbreviation in Ink Muted, finished with a 1px hairline "page edge" instead of a shadow. It's the one place the Lodge Ledger metaphor becomes a literal object on screen. Keep it unique to "what's coming up" — don't reuse the day-sheet motif for anything that isn't a dated, upcoming item.

## Do's and Don'ts

### Do:
- **Do** route every color through the CSS custom-property tokens (`var(--accent)`, `var(--surface)`, etc.) so a component works correctly in both light and dark mode automatically.
- **Do** reserve Aged Brass for primary actions, links, and calendar-day numbers only — never as decoration or a second highlight color elsewhere.
- **Do** keep Focus Blue exclusively for the `:focus-visible` ring; never reuse it as a UI accent.
- **Do** give every card, panel, table, and modal the same ambient shadow at rest (The Structural Shadow Rule) — don't leave a surface flat because it feels minor.
- **Do** fade inactive/retired records with reduced opacity (0.62–0.72) rather than hiding or deleting them from view.
- **Do** keep the relation-pill palette (rose/blue/tan) constant across both themes — it's an intentional exception, not a gap to fix.

### Don't:
- **Don't** introduce a fifth border-radius value. Every shape resolves to 6px (controls), 8px (containers), 999px (pills), 50% (circles), or 4px (day-sheet only).
- **Don't** add a second accent color, a gradient beyond the existing subtle auth-shell wash, or any glassmorphism/blur effect. The palette is one warm neutral family plus one brass accent.
- **Don't** use the serif display font for anything other than headings, the brand name, and headline numbers; body copy, forms, and tables stay in Source Sans 3.
- **Don't** hardcode a new literal color in a component when a token already exists for it.
- **Don't** give the sidebar's active/hover nav state the accent color — it fills with Parchment Muted so wayfinding never competes visually with primary actions.
