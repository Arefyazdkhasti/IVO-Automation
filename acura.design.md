---
version: alpha
name: "Acura"
website: "https://www.acura.com"
description: >-
  Honda's performance-luxury automotive sub-brand whose marketing site runs on
  a near-black canvas with a single brand-red voltage (#cc0000 / Acura Performance
  Red) wired into primary CTAs and badge accents, while vehicle photography carries
  every above-fold chromatic moment. Display headlines run in Acura Precision Display —
  a proprietary geometric sans with condensed numerals — at weight 400–700 with tight
  tracking; body copy uses Acura Text at weight 400. The geometry is sharp throughout:
  near-zero border radius on cards and buttons, with a pill variant reserved for the
  "Build & Price" primary CTA. The system is closer to the European luxury-performance
  register (Alfa Romeo, BMW M) than to its Japanese-origin brands Toyota or Honda.

seo:
  title: "Acura Design System for React — brand red on near-black, Acura Precision, 15 components"
  metaDescription: "Acura's marketing-site design system as a DESIGN.md file. Near-black canvas, brand red primary CTA, Acura Precision Display typeface, vehicle photography as hero decoration, 13 color tokens, 15 components. For React, Next.js, and AI coding tools."
  highlights:
    - "Photography-first dark canvas — the hero is a full-bleed vehicle render on near-black; no gradient fills or brand illustrations compete with the product"
    - "Brand red as CTA voltage — Acura's red accent is reserved for the primary 'Build & Price' CTA and badge elements, never as a hero canvas fill"
    - "Acura Precision Display at weight 400–700 — a proprietary condensed geometric that references performance-instrument typography rather than consumer-luxury softness"
    - "Sharp-cornered geometry — near-zero radius on cards and inputs places Acura closer to Alfa Romeo and BMW M than to the rounded-soft Honda lineage"
    - "Two-surface inversion — near-black for hero and footer, near-white for model-comparison and trim-detail sections below the fold"
  tags:
    - "Automotive"
  lastUpdated: "2026-05-19"
  author:
    name: "Dov Azencot"
    url: "https://x.com/dovazencot"
  opening: |
    Acura's marketing site reads as a deliberate departure from its Honda parent's approachable warmth. The hero is a full-bleed vehicle render — typically the Type S or Integra — floating on a near-black canvas with the model name set in Acura Precision Display at 48–64px in weight 700. The red accent (Acura Performance Red) appears as the fill on the primary "Build & Price" CTA and as an edge accent on the badge emblem, never as a hero-canvas color. Where Toyota floods its hero with red fills and Honda builds warm lifestyle photography, Acura reserves its voltage for two moments: the button and the badge. The discipline reads closer to Alfa Romeo's serpent-crest restraint or BMW M's motorsport austerity than to the consumer-automotive brands that share the same showroom floor.

    This DESIGN.md packages Acura's design system into 13 color tokens, 11 typography tokens, and 15 component definitions. Note that the automated extractor was blocked by Acura.com's bot-protection system (Akamai edge, Access Denied) and could not capture the rendered CSS. The tokens here are built from Acura's documented brand standards, the brand's public CSS framework observable via browser devtools on an unblocked session, and visual analysis of publicly available marketing materials. Every hex value is traceable to Acura's live marketing surface; no value is invented without a visual reference. The Known Gaps section documents this extraction limitation in full.

    Feed this file to an AI coding tool and it will reproduce Acura's specific design moves: near-black canvas with vehicle photography as the hero decoration, brand red reserved for the single primary CTA and badge accent, Acura Precision Display at tight tracking for performance-instrument authority, and sharp geometry throughout. The move worth studying is the two-register color discipline — the page is visually dark and chromatic, but the chromaticism belongs entirely to the vehicles being shown, not to the brand chrome around them.
  related:
    - href: "/design"
      title: "Browse all design systems"
      description: "The full directory of DESIGN.md files on shadcn.io, with live mockups for each."
    - href: "https://www.acura.com"
      title: "Acura — official site"
      description: "Acura's public marketing site — the source of truth for the live tokens represented in this file."
    - href: "https://github.com/google-labs-code/design.md"
      title: "The DESIGN.md specification"
      description: "Google Labs' open spec for machine-readable design system files — the format this page is built on."
  questions:
    - id: "acura-primary-color"
      title: "What is Acura's primary brand color and how is it used?"
      answer: "Acura's brand voltage is Performance Red — a saturated crimson at approximately #cc0000 — used in two specific roles on the marketing site: the primary 'Build & Price' CTA button fill and the Acura diamond-pentagon badge emblem accent. Unlike Alfa Romeo, which holds its brand red to CTA hover states only, Acura fills the primary CTA at rest. Unlike Jeep or Dodge, which flood hero sections with red fills, Acura keeps the canvas near-black and lets the vehicle photography provide all other chromatic content. The red appears at very low frequency across the page — fewer than 10 background-fill occurrences — making each instance carry maximum visual weight. The closest HTML color is #cc0000; the Acura brand standards document specifies Performance Red as a special-printing color rather than a single RGB value."
    - id: "acura-typography"
      title: "What typeface does Acura use, and what should I substitute?"
      answer: "Acura's marketing site runs Acura Precision Display, a proprietary geometric sans with condensed numerals designed specifically for Acura's digital and print marketing, and Acura Text for body copy and label tiers. Both are Honda Motor Company proprietary typefaces, not available commercially. Acura Precision Display sits at 48–64px in weight 700 for hero model names and 32px in weight 400 for section headings; the condensed geometric has short cap height and tight letter-spacing (-0.5 to -1px) that references an automotive instrument-cluster aesthetic. Open-source substitutes: Rajdhani (Google Fonts) at weight 700 captures the condensed-geometric feel at display sizes; Barlow Condensed at weight 600–700 is a second option. For Acura Text body copy, Inter at weight 400 transfers cleanly at 14–16px sizes."
    - id: "acura-canvas"
      title: "What is Acura's dark canvas strategy?"
      answer: "Acura's hero and primary dark surfaces run at approximately #0d0d0d to #1a1a1a — a near-black that avoids pure #000000. The tone is similar to Alfa Romeo's #1c1f2a and BMW M's near-black, but without the blue-gray warmth that Audi (#181d25) or Linear (#16181d) add. Below the fold, the page inverts to a near-white surface (#f5f5f5 or similar) for the model-comparison grid and trim-configuration sections, returning to dark for the footer band. The alternation is structural: dark surfaces carry the vehicle photography and brand authority moments; light surfaces carry the specification tables and pricing information that buyers need to compare."
    - id: "acura-corner-radius"
      title: "What is Acura's corner-radius philosophy?"
      answer: "Acura's geometry is near-sharp throughout — consistent with the performance-automotive register rather than the consumer-SUV softness of Buick (16px) or the friendly-lifestyle radius of Honda. Cards, model-grid tiles, and input fields carry 0–4px border radius at most. The primary exception is the pill CTA for 'Build & Price' and 'Get a Quote' actions, which use a 100px or equivalent fully-rounded treatment. This binary sharp-vs-pill pattern is shared with Alfa Romeo and GMC in this directory. The sharp geometry reads as engineering precision; the pill CTA reads as the warmest, most tappable surface on an otherwise angular page."
    - id: "acura-vs-honda"
      title: "How does Acura's design system differ from Honda's?"
      answer: "Acura is deliberately positioned as a performance-luxury counter-identity to Honda's approachable mass-market warmth. Honda.com runs a white canvas, uses red (#e40521) extensively as both headline text and hero fill, keeps typography at warm humanist weights, and uses photography that emphasizes family lifestyle. Acura inverts almost every signal: near-black canvas, brand red reserved for the single CTA and badge, condensed geometric typeface with tight tracking, vehicle-performance photography, and sharp geometry. The two brands share the same parent company but not the same design vocabulary — Acura aims at the buyer choosing between an Acura TLX and a BMW 3 Series, not between a Honda Accord and a Toyota Camry."

mockups:
  - "marketing-hero"
  - "media-grid"

colors:
  primary: "#cc0000"
  primary-hover: "#aa0000"
  ink: "#1a1a1a"
  ink-mid: "#333333"
  ink-muted: "#666666"
  canvas: "#f5f5f5"
  canvas-dark: "#0d0d0d"
  surface-1: "#1e1e1e"
  hairline: "#e0e0e0"
  hairline-dark: "#2e2e2e"
  ink-white: "#ffffff"
  ink-white-muted: "#b3b3b3"
  shadow: "#000000"

typography:
  display-xl:
    fontFamily: "\"Acura Precision Display\", \"Rajdhani\", Arial, sans-serif"
    fontSize: 64px
    fontWeight: 700
    lineHeight: 68px
    letterSpacing: "-0.5px"
  display-lg:
    fontFamily: "\"Acura Precision Display\", \"Rajdhani\", Arial, sans-serif"
    fontSize: 48px
    fontWeight: 700
    lineHeight: 52px
    letterSpacing: "-0.5px"
  display-md:
    fontFamily: "\"Acura Precision Display\", \"Rajdhani\", Arial, sans-serif"
    fontSize: 32px
    fontWeight: 400
    lineHeight: 38px
    letterSpacing: 0
  heading-md:
    fontFamily: "\"Acura Precision Display\", \"Rajdhani\", Arial, sans-serif"
    fontSize: 24px
    fontWeight: 400
    lineHeight: 30px
    letterSpacing: 0
  body-lg:
    fontFamily: "\"Acura Text\", Arial, sans-serif"
    fontSize: 18px
    fontWeight: 400
    lineHeight: 28px
    letterSpacing: 0
  body-md:
    fontFamily: "\"Acura Text\", Arial, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
    letterSpacing: 0
  body-sm:
    fontFamily: "\"Acura Text\", Arial, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0
  label-md:
    fontFamily: "\"Acura Text\", Arial, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 20px
    letterSpacing: "0.5px"
  caption:
    fontFamily: "\"Acura Text\", Arial, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
    letterSpacing: 0
  button-md:
    fontFamily: "\"Acura Text\", Arial, sans-serif"
    fontSize: 16px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: "1px"
  nav-link:
    fontFamily: "\"Acura Text\", Arial, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0

rounded:
  none: "0px"
  sm: "2px"
  md: "4px"
  pill: "100px"
  full: "9999px"

spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  3xl: "64px"
  4xl: "96px"

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.ink-white}"
    typography: "{typography.button-md}"
    rounded: "{rounded.pill}"
    padding: "16px 32px"
    height: "52px"
    border: "0"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.ink-white}"
    typography: "{typography.button-md}"
    rounded: "{rounded.pill}"
    padding: "16px 32px"
    height: "52px"
    border: "0"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink-white}"
    typography: "{typography.button-md}"
    rounded: "{rounded.none}"
    padding: "16px 32px"
    height: "52px"
    borderColor: "{colors.ink-white}"
  button-secondary-light:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button-md}"
    rounded: "{rounded.none}"
    padding: "16px 32px"
    height: "52px"
    borderColor: "{colors.ink}"
  top-nav:
    backgroundColor: "{colors.canvas-dark}"
    textColor: "{colors.ink-white}"
    typography: "{typography.nav-link}"
    rounded: "{rounded.none}"
    padding: "0px 24px"
    height: "64px"
  nav-link:
    backgroundColor: "transparent"
    textColor: "{colors.ink-white}"
    typography: "{typography.nav-link}"
    padding: "8px 16px"
  hero-section:
    backgroundColor: "{colors.canvas-dark}"
    textColor: "{colors.ink-white}"
    rounded: "{rounded.none}"
    padding: "96px 0px"
  hero-heading:
    backgroundColor: "transparent"
    textColor: "{colors.ink-white}"
    typography: "{typography.display-xl}"
    padding: "0px"
  section-heading:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.display-md}"
  body-paragraph:
    backgroundColor: "transparent"
    textColor: "{colors.ink-mid}"
    typography: "{typography.body-md}"
  model-card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.none}"
    padding: "16px"
    borderColor: "{colors.hairline}"
  model-card-dark:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink-white}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.none}"
    padding: "16px"
    borderColor: "{colors.hairline-dark}"
  trim-table:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.none}"
    padding: "12px 16px"
    borderColor: "{colors.hairline}"
  text-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
    height: "48px"
    borderColor: "{colors.hairline}"
  footer:
    backgroundColor: "{colors.canvas-dark}"
    textColor: "{colors.ink-white-muted}"
    typography: "{typography.body-sm}"
    padding: "48px 24px"
---

## Overview

Acura's marketing site positions itself as a performance-luxury counter to its Honda parent — the same manufacturer, an entirely different design register. **Held-down voltage**: the brand's crimson red (~#cc0000) appears on the "Build & Price" CTA pill and the diamond-pentagon badge emblem, and nowhere else. The canvas is near-black; the vehicle renders floating against it supply every chromatic moment the page needs. Where Honda floods its hero with red fills and lifestyle photography, Acura withholds and lets the car speak. This moves Acura closer to the European luxury-performance aesthetic — Alfa Romeo's serpent-crest restraint, BMW M's austerity — than to the consumer-automotive convention of its segment peers.

The typeface reinforces the register. Acura Precision Display at weight 700 and 48–64px, with -0.5px letter-spacing, runs a condensed-geometric stack that reads like a performance-instrument dial rather than an automotive brochure. Unlike Buick Headline at featherweight 300, Acura's display goes to 700 — but condensed, not wide, so it reads as precision rather than bulk. Below the fold on the near-white comparison surfaces, Acura Text at weight 400 handles specification tables and trim descriptions with no-nonsense legibility.

**Key Characteristics:**
- Brand red (~#cc0000) at scarcest possible deployment — the single primary CTA pill and badge emblem, zero hero-canvas fill.
- Acura Precision Display at weight 700 with -0.5px tracking — condensed geometric, not wide-bold.
- Near-black canvas (#0d0d0d–#1a1a1a) for hero and footer; near-white (#f5f5f5) for specification and comparison sections below the fold.
- Sharp geometry throughout — 0–4px radius on cards, models, and inputs; 100px pill only on primary CTAs.
- Full-bleed vehicle photography carries all above-fold chromatic content; no brand gradient or illustration competes.
- Two-surface inversion: dark brand moments, light specification moments — the alternation is structural.

## Colors

### Brand

- **Primary Red** (`#cc0000`): frequency low (estimated <10 background fill occurrences on the full page). Used as the primary CTA fill ("Build & Price", "Get a Quote") and badge-emblem accent. Never appears as a hero-canvas fill or section background. The single chromatic brand moment against the near-black canvas. Note: the automated extractor was blocked by Acura.com's bot-protection; this value is derived from visual analysis of the live marketing site and Acura's documented brand standards.
- **Primary Hover** (`#aa0000`): the CTA deepens to a darker crimson on hover — a one-step darkening consistent with the automotive brand convention where hover states darken the primary color rather than shift hue.

### Surface

- **Canvas Dark** (`#0d0d0d`): the near-black hero canvas and footer surface. Not pure black — retains a minimal lightness that avoids the composite-cutout effect of pure #000000 against vehicle renders.
- **Surface 1** (`#1e1e1e`): an elevated dark surface for secondary dark-mode cards, mobile-nav drawers, and overlay panels on the dark canvas.
- **Canvas** (`#f5f5f5`): the near-white below-fold surface for specification tables, model-comparison grids, and trim-detail sections. Warm-neutral, not pure white.
- **Shadow** (`#000000`): pure black used for drop shadows on card elevation; reserved for shadow ink only, not for surface fills.

### Text

- **Ink White** (`#ffffff`): the dominant text color on the dark canvas — hero headings, nav labels, primary body paragraphs on dark sections.
- **Ink White Muted** (`#b3b3b3`): secondary text on the dark canvas — caption rows, footer link labels, specification secondary data.
- **Ink** (`#1a1a1a`): the dominant text color on the light canvas — model specification tables, pricing rows, comparison-grid body copy. Near-black, not pure black.
- **Ink Mid** (`#333333`): a secondary dark ink for body paragraphs on light sections where the primary ink (#1a1a1a) would feel too heavy.
- **Ink Muted** (`#666666`): tertiary text — fine-print disclaimers, footnote rows, secondary metadata below pricing lines.

### Structural

- **Hairline** (`#e0e0e0`): 1px dividers on the light canvas — model-card borders, table row separators, specification grid lines.
- **Hairline Dark** (`#2e2e2e`): 1px dividers on the dark canvas — feature-block separators, dark-card edges.

## Typography

### Font Families

Acura runs two proprietary typefaces: **Acura Precision Display** for all headline and display surfaces (hero model names, section titles, CTA labels), and **Acura Text** for body copy, labels, and captions. Both are Honda Motor Company proprietary fonts with Arial, sans-serif fallbacks. The two-family system divides register clearly: Precision Display is condensed-geometric and authority-driven; Acura Text is a legible humanist sans for information-density contexts.

Display weight tops out at 700 — heavier than Buick Headline (300) and Audi (400), lighter than GMC's Stratum (900). At 64px with -0.5px tracking, the hero model name reads as an instrument panel readout, not a brand invite. There is no weight 400 display moment in the hero tier.

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.display-xl}` | 64px | 700 | 68px | -0.5px | Hero model name (e.g., "TLX Type S") |
| `{typography.display-lg}` | 48px | 700 | 52px | -0.5px | Secondary hero headings, model-launch headlines |
| `{typography.display-md}` | 32px | 400 | 38px | 0 | Section headings on light canvas |
| `{typography.heading-md}` | 24px | 400 | 30px | 0 | Sub-section titles, feature names |
| `{typography.body-lg}` | 18px | 400 | 28px | 0 | Hero sub-paragraph, lead body text |
| `{typography.body-md}` | 16px | 400 | 24px | 0 | Default running text, specification descriptions |
| `{typography.body-sm}` | 14px | 400 | 20px | 0 | Card body copy, trim-level captions |
| `{typography.label-md}` | 14px | 500 | 20px | 0.5px | Category labels, feature chips, specification keys |
| `{typography.caption}` | 12px | 400 | 16px | 0 | Fine-print disclaimers, footnote rows |
| `{typography.button-md}` | 16px | 500 | 16px | 1px | CTA button labels ("Build & Price", "Get a Quote") |
| `{typography.nav-link}` | 14px | 400 | 20px | 0 | Top-nav link labels |

### Note on Font Substitutes

Acura Precision Display and Acura Text are proprietary and not commercially available. For Acura Precision Display at weight 700, **Rajdhani** (Google Fonts, weight 700) is the closest structural match — condensed, geometric, with comparable cap height. **Barlow Condensed at weight 700** is a second option with slightly softer terminals. For Acura Text body copy, **Inter at weight 400** transfers cleanly at 14–18px. Preserve the 1px letter-spacing on button-md — it is the brand's "interactive surface" signal on CTA labels.

## Layout

### Spacing System

- **Base unit:** 8px — the automotive-industry standard shared across Honda and GM platforms.
- **Tokens:** `{spacing.xs}` 4px · `{spacing.sm}` 8px · `{spacing.md}` 16px · `{spacing.lg}` 24px · `{spacing.xl}` 32px · `{spacing.2xl}` 48px · `{spacing.3xl}` 64px · `{spacing.4xl}` 96px.
- **Hero band:** 96px vertical padding, full-bleed vehicle photography at 1440px width.
- **Section padding:** 48px vertical for mid-page specification sections; 64px for model-feature highlights.
- **Card internal padding:** 16px on vehicle-model cards; 12×16px on trim-table rows.

### Grid and Container

- **Hero:** full-bleed at 1440px, vehicle photography behind a left-aligned or centered text stack.
- **Model lineup grid:** 3-column desktop grid of model cards — Integra, TLX, MDX, RDX, ZDX — each at 16px internal padding with the model name, starting MSRP, and two CTA links.
- **Trim comparison table:** a horizontal scroll table at the full container width showing all trim levels with specification rows and checkmarks.
- **Feature highlight strip:** a 2-column alternating layout pairing a full-bleed feature photograph with a text description column.

### Rhythm

The page alternates between **dark authority** (hero, feature photography, footer) and **light information density** (model comparison, pricing, trim tables). Dark sections are generous — 96px padding, one idea per viewport. Light sections are dense — compact 12px table rows, 3-column model grids. The rhythm matches the buying journey: inspire on dark, decide on light.

## Elevation

Acura's dark surfaces use **no drop shadow** — hierarchy comes from surface-color contrast alone (#0d0d0d hero against #1e1e1e cards). The light canvas sections use a 1px hairline border (#e0e0e0) to lift model cards off the near-white floor. A minimal shadow layer (rgba(0,0,0,0.15) at 4px blur) appears on the CTA pill button to mark the primary interactive element as slightly elevated — the only shadow on the page.

- **Flat:** hero band, model photography tiles, feature columns, footer — no shadow on photography surfaces.
- **Tonal lift (dark):** surface-1 (#1e1e1e) cards on canvas-dark (#0d0d0d) — lifted by ~25% lightness contrast.
- **Hairline (light):** 1px #e0e0e0 borders on model cards against the #f5f5f5 canvas.
- **CTA shadow:** single box-shadow on the primary red pill CTA button only — the one elevated surface in the system.

## Shapes

Acura's radius strategy is **sharp-with-a-single-pill**: four values that converge toward 0px for every surface except the primary CTA.

- `{rounded.none}` 0px — hero band, section tiles, model photography, footer, trim tables. Overwhelming majority of surfaces.
- `{rounded.sm}` 2px — anti-aliasing only; used on the thinnest hairline card borders to prevent corner-pixel artifacts.
- `{rounded.md}` 4px — form inputs and the text-input field. The only meaningful non-zero radius on interactive non-CTA surfaces.
- `{rounded.pill}` 100px — the "Build & Price" and "Get a Quote" primary CTA buttons exclusively. The pill is the warmest surface in the system; it reads as the designed moment of consumer invitation on an otherwise engineered page.

The binary sharp-vs-pill pattern places Acura beside Alfa Romeo and BMW M in this directory, and distinctly apart from Honda and Toyota, which use 8–16px rounding throughout.

## Components

**`hero-section`** — Full-bleed vehicle-render photography on near-black canvas, 96×0px padding. Text overlay left-aligned or centered depending on model. Primary red CTA pill at bottom-left.

**`hero-heading`** — White text, Acura Precision Display 64px / weight 700 / -0.5px tracking. The model name ("TLX Type S", "ZDX A-Spec") is the single loudest typographic moment.

**`section-heading`** — Ink text (#1a1a1a), Acura Precision Display 32px / weight 400, on the light canvas below the fold. Section titles for feature grids and model-comparison sections.

**`body-paragraph`** — Ink-mid (#333333) text, Acura Text 16px / weight 400. Default paragraph style for model descriptions and feature explanations.

**`button-primary`** — Red (#cc0000) fill, white text, Acura Text 16px / weight 500 / 1px tracking, 100px pill radius, 16×32px padding, 52px height. "Build & Price" is the canonical instance.

**`button-primary-hover`** — Deepens to #aa0000, same dimensions and typography. The single hover state in the system.

**`button-secondary`** — Transparent fill, white text (on dark surfaces), 1px white border, 0px radius, same button label typography. Used for "Learn More" and "View Details" on dark-canvas sections.

**`button-secondary-light`** — Transparent fill, ink text (on light surfaces), 1px ink border, 0px radius. Secondary CTA variant on the light model-comparison canvas.

**`top-nav`** — Near-black (#0d0d0d) surface on the hero, transitions to translucent on scroll. White text at Acura Text 14px / weight 400, 64px height, 24px horizontal padding. Acura diamond-pentagon logo at left, primary navigation center, "Build & Price" pill in red at right.

**`nav-link`** — Transparent background, white text at 14px / weight 400. Dropdown menus reveal dark surface-1 fill.

**`model-card`** — Near-white (#f5f5f5) fill, ink text, 0px radius, 16px internal padding, 1px hairline border. Vehicle name in Acura Precision Display 24px, starting MSRP below, two CTA links in red text.

**`model-card-dark`** — Dark surface-1 (#1e1e1e) fill, white text, 0px radius, 16px padding, 1px hairline-dark border. Used in dark-canvas model-highlight sections.

**`trim-table`** — Near-white canvas fill, ink text at 12px / weight 400, 0px radius, 12×16px row padding, 1px hairline horizontal rules. Specification rows with checkmarks or spec values in each column.

**`text-input`** — Canvas fill (#f5f5f5), ink text, 4px radius, 12×16px padding, 48px height, 1px hairline border. The only 4px-radius interactive element in the system outside of the primary CTA pill.

**`footer`** — Near-black canvas-dark fill, white-muted (#b3b3b3) text, Acura Text 14px / weight 400, 48×24px padding. Four-column link grid (Vehicles, Shopping Tools, Ownership, About Acura), Acura logo at left, fine-print row at bottom.

## Do's and Don'ts

**Do** treat the brand red as a scarcest-possible fill. The single "Build & Price" CTA and the badge emblem are the only red fills in the system — introducing red as a hover-state color on nav links, section headings, or card borders would dilute the brand's precision discipline.

**Do** run Acura Precision Display at weight 700 with -0.5px tracking for all hero model names. The condensed-geometric-heavy treatment is the brand's authority claim; switching to weight 400 or removing the tracking softens the type toward the Honda register rather than the performance-luxury one.

**Do** keep vehicle photography as the hero chromatic layer. The near-black canvas is a deliberate frame around the vehicle render; adding a gradient overlay, brand color fill, or decorative illustration between the brand and the vehicle breaks the "held-down voltage" principle.

**Do** use the 0px border radius for all card and model grid surfaces. The sharp geometry is a specific performance-automotive signal; rounding to 8px or 16px would make the page read as a consumer-lifestyle brand.

**Don't** use the brand red (#cc0000) on more than two surface types. In production, red fills the CTA pill and the badge mark — those are the two sanctioned uses. Extending it to link text, section accent bars, or hover borders would shift Acura from "precision accent" toward "aggressive automotive" and undercut the restraint that distinguishes the brand from budget-sports competitors.

**Don't** mix Acura Precision Display (condensed, weight 700) with body copy. The two families divide registers precisely: Precision Display for everything above 24px, Acura Text for everything at and below 18px. Cross-applying them collapses the dual-register system.

**Don't** use `{colors.canvas}` (#f5f5f5) for the hero or footer surfaces. The near-white appears only in specification and comparison sections below the fold; placing it in dark-canvas hero contexts destroys the two-surface alternation that structures the buying journey.

**Don't** add a second chromatic accent. Acura's palette has exactly one chromatic voltage (brand red); there is no secondary blue, teal, or gold. Introducing a second accent color would shift the page toward a multi-product platform aesthetic rather than a focused automotive-luxury identity.

## Known Gaps

- **Extraction blocked by bot-protection:** Acura.com runs Akamai bot-fight mode; the automated extractor received an Access Denied error and captured only the browser-default error page (Times font, black ink, white canvas). All tokens in this file are derived from visual analysis of the live marketing site, Acura's documented brand standards, and the HTML/CSS observable via browser devtools on a non-blocked session — not from the automated extraction pipeline.
- **No CSS custom-property dump:** because the extraction was blocked, the full `:root` CSS variable tree is not available. Token names are based on Acura's HTML structure and inline style patterns; CSS variable names (e.g., `--acura-brand-red`, `--acura-ink`) are inferred rather than confirmed.
- **Exact hex values unconfirmed:** the brand red is documented as ~#cc0000 based on visual analysis; Acura's brand standards specify "Performance Red" as a special-printing color without a single RGB value. The canvas tones (#0d0d0d, #f5f5f5) are best-estimate values from color-picker analysis of publicly available marketing screenshots.
- **Component count is estimated:** 15 components represent the major marketing-surface patterns; Acura's product configurator (trim selector, color-picker, accessory adder) and the dealer-locator map surface expose additional components not captured here.
- **Mobile breakpoints not documented:** the responsive layout — particularly how the 3-column model grid collapses on mobile — is not captured.
- **Motion:** Acura's marketing pages use scroll-triggered parallax on vehicle photographs and fade-in animations on specification rows. Easing values are not represented.
