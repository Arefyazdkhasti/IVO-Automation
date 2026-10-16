---
version: "alpha"
name: "Corporate Radial Process"
description: "Corporate Radial Process — Design data visualization com radial, process, timeline. Template e prompt pronto para IA."
colors:
  primary: "#FFFFFF"
  secondary: "#333333"
  tertiary: "#008B8B"
  neutral: "#008B8B"
  surface: "#20B2AA"
  accent: "#48D1CC"
typography:
  h1:
    fontFamily: Open Sans
    fontSize: 2.5rem
    fontWeight: 700
  body-md:
    fontFamily: Open Sans
    fontSize: 1rem
    fontWeight: 400
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral}"
    padding: 12px
---

## Overview

Corporate Radial Process — Design data visualization com radial, process, timeline. Template e prompt pronto para IA. Estilo Corporate Radial Process representa uma tendência moderna em design UI/UX web com foco em data visualization.

- Density: 3/10 — Airy
- Variance: 2/10 — Structured
- Motion: 4/10 — Subtle

- **Style:** Professional, Structured, Organizational
- **Keywords:** radial, process, timeline, corporate, clean, vector, flat, organization
- **Era:** Modern Corporate
- **Light/Dark:** ✓ Full / ✗ No

## Colors

- **Background** (#FFFFFF) — Primary background surface
- **Text** (#333333) — Primary text color
- **Accent** (#008B8B) — Primary accent, CTAs and interactive elements
- **Segment 1** (#008B8B) — Extended palette, decorative use
- **Segment 2** (#20B2AA) — Extended palette, decorative use
- **Segment 3** (#48D1CC) — Extended palette, decorative use

## Typography

- **Display / Hero:** Open Sans — Weight 700, tight tracking, used for headline impact
- **Body:** Open Sans — Weight 400, 16px/1.6 line-height, max 72ch per line
- **UI Labels / Captions:** Open Sans — 0.875rem, weight 500, slight letter-spacing
- **Monospace:** JetBrains Mono — Used for code, metadata, and technical values

Scale:
- Hero: clamp(2.5rem, 5vw, 4rem)
- H1: 2.25rem
- H2: 1.5rem
- Body: 1rem / 1.6
- Small: 0.875rem

## Layout

- **Grid:** CSS Grid primary. Max-width containment: 1280px centered with 1.5rem side padding.
- **Spacing rhythm:** Balanced. Base unit: 0.5rem (8px).
- **Section vertical gaps:** clamp(4rem, 8vw, 8rem).
- **Hero layout:** Split-screen (text left, visual right).
- **Feature sections:** Zig-zag alternating text+image rows. No 3-equal-columns.
- **Mobile collapse:** All multi-column layouts collapse below 768px. No horizontal overflow.
- **z-index contract:** base (0) / sticky-nav (100) / overlay (200) / modal (300) / toast (500).

## Elevation & Depth

Semi-circular timeline, segmented process arc, white simple glyphs inside colored segments, flat vector clean matte finish.

- **Physics:** Ease-out curves, 200-300ms duration. Smooth and predictable.
- **Entry animations:** Fade + translate-Y (16px → 0) over 420ms ease-out. Staggered cascades for lists: 80ms between items.
- **Hover states:** Subtle color shift + shadow adjustment over 200ms.
- **Page transitions:** Fade only (200ms).
- **Performance:** Only transform and opacity animated. No layout-triggering properties.

## Shapes

Base corner radius: 9999px. See rounded tokens in front matter for the full scale.

## Components

- **Primary Button:** Rounded (50%) shape. Accent color fill. Hover: 8% darken + subtle lift shadow. Active: -1px translate tactile press. Font weight 600. No outer glows.
- **Secondary / Ghost Button:** Outline variant. 1.5px border in muted color. Text in primary color. Hover: subtle background fill.
- **Cards:** Rounded (50%) corners. Surface background. Subtle shadow (0 2px 12px rgba(0,0,0,0.06)). 1px border stroke.
- **Inputs:** Label above input. 1px border stroke. Focus ring: 2px accent color offset 2px. Error text below in semantic red. No floating labels.
- **Navigation:** Primary surface background. Active item: accent color indicator. Font weight 500 when active.
- **Skeletons:** Shimmer animation matching component dimensions. No circular spinners.
- **Empty States:** Icon-based composition with descriptive text and action button.

## Do's and Don'ts

- No emojis in UI — use icon system only (Lucide, Heroicons)
- No pure black (#000000) — use off-black or charcoal variants
- No oversaturated accent colors (saturation cap: 80%)
- No 3-column equal-width feature layouts — use zig-zag or asymmetric grid
- No `h-screen` — use `min-h-[100dvh]`
- No AI copywriting clichés: "Elevate", "Seamless", "Unleash", "Next-Gen"
- No broken external image links — use picsum.photos or inline SVG
- No generic lorem ipsum in demos

- Do Radial/Circular layout elements
- Do Clean white background
- Do Teal/Cyan color palette
- Do Step-by-step process visualization
- Do Simple glyph icons

## Use Case

Landing pages, Websites modernas
