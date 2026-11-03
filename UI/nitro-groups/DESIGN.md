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

Inter for reading, Inter Tight for headings (`.type-poster`, `.type-heading`): weight 600, tracking
-0.03 to -0.038em. Body 17px, secondary 16px, labels 13px. Headlines are big but never heavy.

## Glass

`.vidrio`: translucent `rgb(28 25 37 / 0.55)`, `blur(24px) saturate(160%)`, a 1px light edge and a lit
top edge. Used only where something floats over content: the sticky navigation, the hero search, the
floating "free this Saturday" card and the step panel. Never on content blocks.

## Shapes

Pill buttons (`rounded-full`), 12px fields, 16–28px cards and panels with a `linea` edge. No shadows
except under glass.

## Motion

Transform, opacity and filter only; nothing travels with `prefers-reduced-motion`.

- Hero headline: each word rises out of its own mask, 70ms apart (`.palabras`).
- Hero visual: sound waves drawn in code, flowing slowly (`Ondas`, `.onda`), with a breathing lilac
  glow (`.resplandor-vivo`).
- Sections enter part by part with a soft blur-to-sharp rise (`data-reveal`, 90ms stagger).
- One statement lights up word by word as it crosses the screen (`.ilumina`, scroll-driven).
- "How it works" advances on its own every 6.5s with a progress line, pauses on hover or focus, and
  never advances with reduced motion (`Pasos`).
- Cards lift 4px on hover; buttons press to 98%.

## Pictures

Each group's own photos come from its gallery. Without photos a group shows its initials on a quiet
surface with a faint lilac light: never a stock photo pretending to be the group. Archival pictures
from open collections are pending: Wikimedia answers this environment with HTTP 429.

## Inspector exceptions

`inspect.mjs` runs with `--allow palette-purple,glass,gradient,shadow,hairline,outlined-box`: the owner
asked for this look (lilac brand, liquid glass, Corva-style edges). Every other house rule holds.
