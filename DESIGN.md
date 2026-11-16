---
name: LodgeCal
description: A dignified Masonic Lodge birthday, household, and milestone register with Deep Indigo and Warm Gold accents
colors:
  primary-indigo: "#2E3A8C"
  primary-indigo-hover: "#232D70"
  primary-indigo-dark: "#6A78D9"
  header-indigo-dark: "#1F2658"
  on-primary: "#FFFFFF"
  accent-gold: "#C1912E"
  accent-gold-hover: "#A87C24"
  accent-gold-dark: "#E8C86A"
  on-accent: "#1A1B1E"
  bg-light: "#F9FAFC"
  bg-dark: "#1A1B1E"
  surface-light: "#FFFFFF"
  surface-dark: "#25272B"
  text-primary-light: "#212529"
  text-primary-dark: "#E1E3E8"
  text-secondary-light: "#495057"
  text-secondary-dark: "#A1A3A8"
  border-light: "#E2E5E9"
  border-dark: "#3A3C42"
  tint-indigo-light: "#EEF0FA"
  tint-indigo-dark: "#2D3050"
  tint-gold-light: "#FBF3E0"
  tint-gold-dark: "#3A3322"
  success: "#28A745"
  danger: "#D9534F"
typography:
  hero:
    fontFamily: "Source Serif 4, Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif"
    fontSize: "2.75rem"
    fontWeight: 500
    lineHeight: 1.2
  display:
    fontFamily: "Source Serif 4, Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif"
    fontSize: "2.375rem"
    fontWeight: 600
    lineHeight: 1.15
  title-lg:
    fontFamily: "Source Serif 4, Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif"
    fontSize: "1.75rem"
    fontWeight: 600
  title-md:
    fontFamily: "Source Serif 4, Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 600
  headline:
    fontFamily: "Source Serif 4, Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: 1.2
  brand:
    fontFamily: "Source Serif 4, Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif"
    fontSize: "1.3125rem"
    fontWeight: 600
  subhead:
    fontFamily: "Source Serif 4, Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 600
  lead:
    fontFamily: "Source Sans 3, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
  body:
    fontFamily: "Source Sans 3, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  ui:
    fontFamily: "Source Sans 3, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 500
  meta:
    fontFamily: "Source Sans 3, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
  label:
    fontFamily: "Source Sans 3, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
  caption:
    fontFamily: "Source Sans 3, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
  mono:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.85em"
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  inner: "10px"
  card: "12px"
  lg: "14px"
  pill: "999px"
  full: "50%"
---

# Design System: LodgeCal ("Masonic Lecture Palette")

## Overview

LodgeCal is a private, self-hosted register for a Masonic Lodge's Brothers, their families, birthdays, personal notes, and Lodge milestones. Its visual language blends classic Masonic colours—**Deep Indigo** (`#2E3A8C`) and **Warm Gold** (`#C1912E`)—with a clean, high-contrast, modern editorial layout on an airy `#F9FAFC` background (and `#1A1B1E` / `#25272B` in dark mode).

**Key Characteristics:**
- **Top Indigo Header Bar** with a Warm Gold active tab underline (`3px solid #E8C86A`) and a persistent Light/Dark mode toggle
- **Split Two-Column Auth Shell** pairing an Indigo mission panel with a crisp Sign-in / Setup card
- **Serif Headings (`Source Serif 4`) + Clean Sans Body (`Source Sans 3`)**
- **Zero-Modal Inline Workflows:** Household cards, dated birthday notes, and administration panels expand inline rather than interrupting with stacked modal dialogs
- **Gold Top-Border Accents (`border-top: 3px solid var(--accent)`)** on primary feature cards (Lodge events sidebar, Family member cards, inline Admin creation panels)

## Colors

| Role | Light Mode | Dark Mode | Purpose |
| :--- | :--- | :--- | :--- |
| **Primary (Brand)** | `#2E3A8C` | `#6A78D9` (`#1F2658` header) | Top navigation bar, auth hero panel, primary buttons, active look-ahead selector |
| **Accent / Highlight** | `#C1912E` | `#E8C86A` | Active nav underline, card top borders, week dividers, link underlines, secondary CTAs |
| **Background** | `#F9FAFC` | `#1A1B1E` | Page canvas |
| **Surface / Card** | `#FFFFFF` | `#25272B` | Cards, panels, tables, and form surfaces |
| **Text – Primary** | `#212529` | `#E1E3E8` | Headings, names, primary copy |
| **Text – Secondary** | `#495057` | `#A1A3A8` | Subtitles, relationship labels, dates, helper copy |
| **Indigo Tint** | `#EEF0FA` | `#2D3050` | Birthday note pills, directory header row, hover fills |
| **Gold Tint** | `#FBF3E0` | `#3A3322` | Soon-countdown pills (`<= 7 days`), "You" badge, helpful callout boxes |
| **Success** | `#28A745` | `#5FC27E` | Confirmations and temporary password banners |
| **Danger / Warning** | `#D9534F` | `#E57373` | Destructive confirmations and validation alerts |
| **Border** | `#E2E5E9` | `#3A3C42` | Hairline card and row dividers |

## Information Architecture

1. **Birthdays (`/`)**: Two-column layout with **Upcoming birthdays** on the left (searchable, switchable `4–8` weeks look-ahead, grouped by week with gold section rules, showing dated birthday notes and contact info to the Admin and the Brother's own household) and **Lodge events** on the right.
2. **My family (`/family`)**: Stacked gold-top cards for the logged-in Brother, his Spouse, and his Children, with inline detail editing, inline **Add family member**, and dated **Notes for the birthday card**.
3. **Brothers (`/brothers`)**: Directory of Lodge Brothers with name search (`Include sleeping brothers` toggle restricted strictly to Admins).
4. **Admin (`/admin`)**: Tabbed administration view (*Brothers and families*, *Lodge events*, *Settings*) with inline expandable drawers.
