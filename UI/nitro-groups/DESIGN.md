# NitroGroups: "Noche"

Sober, dark and calm, in the spirit of Apple's product pages and corva.ai: a lot of space, quiet type,
one accent, glass only where something floats, and motion that eases in rather than jumps. It
replaces the "Cartel de baile" direction at the owner's request ("minimalista, profesional, sobrio,
elegante, tipo Apple, liquid glass solo si logra armonía").

## Colour

A near-black ground with a faint violet cast, warm white ink, one lilac accent (the brand colour,
kept as an accent only).

| Token | Value | Role |
| --- | --- | --- |
| `fondo` | `#0A090E` | Ground |
| `fondo-2` | `#131119` | Raised surfaces: cards, panels, inputs |
| `fondo-3` | `#1D1A25` | Pressed, chips, photo fallback |
| `tinta` | `#F4F2F7` | Ink: all running text |
| `tinta-2` | `#A39DAF` | Secondary text |
| `acento` | `#C9B8FF` | Lilac: the primary action, links on hover, focus ring |
| `acento-ink` | `#120B24` | Text on the accent |
| `linea` | `rgb(255 255 255 / 0.08)` | Hairline edges of surfaces |
| `error` / `ok` | `#FF8F8F` / `#8FDCB2` | States |

## Type

Poppins 700 for titles, Inter for everything people read (as on the owner's reference, corva.ai).
Every page and section title uses one size, `.titulo` (44px on desktop, 30px on a phone), open
tracking and leading 1.25. Body 18px, secondary 16px, labels 13px.

## Alignment

Two axes only: the page margin (left-aligned blocks such as the hero) and one centred column
(`.columna`, 58rem) shared by every centred heading, intro and list.

## Glass

`.vidrio`: a 135° wash from `rgb(36 32 47 / 0.86)` to `rgb(20 18 26 / 0.72)`, `blur(12px)`, a 1px edge
at 5% white, a soft deep shadow and a faint lit top edge. Used only where something floats over content: the sticky navigation, the hero search, the
floating "free this Saturday" card and the step panel. Never on content blocks.

## Shapes

Buttons are 8px rectangles in Poppins 600 at 14px. Fields 8px. Cards and panels (`.superficie`) 12px,
a solid `fondo-2` step with a 2px edge just lighter than it (`#221F2C`); on hover only the edge brightens.
No shadows except under glass.

## Motion

Calm and short, transform and opacity only; nothing travels with `prefers-reduced-motion`.

- Sections and the hero rise 20–24px and fade in over 1s, ease-out, parts 100ms apart (`data-reveal`,
  `.aparece`). No blur.
- Controls answer in 0.3–0.5s with `cubic-bezier(0, 0, 0.2, 1)`: colour and edge changes, no jumps.
- One moving picture: sound waves drawn in code flowing slowly behind the hero (`Ondas`) with a
  breathing lilac glow.
- "How it works" advances every 6.5s with a progress line, pauses on hover or focus, and never
  advances with reduced motion (`Pasos`).

## Pictures

Each group's own photos come from its gallery. Without photos a group shows its initials on a quiet
surface with a faint lilac light: never a stock photo pretending to be the group. Archival pictures
from open collections are pending: Wikimedia answers this environment with HTTP 429.

## Inspector exceptions

`inspect.mjs` runs with `--allow palette-purple,glass,gradient,shadow,hairline,outlined-box`: the owner
asked for this look (lilac brand, liquid glass, Corva-style edges). Every other house rule holds.
