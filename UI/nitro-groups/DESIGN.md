# NitroGroups: "Cartel de baile"

The page is a Mexican dance poster. The name of the group that has your date free runs from margin to
margin, as big as the ink allows; the date and the place sit next to it; the price is in plain sight.
Built with the taste-skill direction `name-as-monument` (seed 1020026138), chosen by the owner from
three dealt directions.

**The idea:** on this page, the dance poster (the group's name huge, the date and the place) becomes the
monument: you pick the day of your party and the poster reprints itself with a group that has that day
free. It is the real search, not an animation (`src/features/cartel/Cartel.tsx`).

## Colour

Lilac paper, purple ink. The lilac is the fluorescent paper of a dance poster and the colour of a
XV años invitation. The house rule against violet is lifted on purpose: the brand asked for lilac and
purple (inspector run with `--allow palette-purple`).

| Token | Value | Role |
| --- | --- | --- |
| `fondo` | `#D6BEFF` | Ground: papel lila |
| `fondo-2` | `#C8A9FB` | One tone step: fields, inputs, panels |
| `fondo-3` | `#B591F4` | Second step: pressed, hover |
| `tinta` | `#1D0736` | Ink: all running text (11:1 on `fondo`) |
| `tinta-2` | `#4A2C72` | Secondary notes only (6.7:1 on `fondo`) |
| `acento` | `#4B12B8` | Morado de imprenta: the primary action, one per screen |
| `error` / `ok` | `#860A31` / `#0A4A29` | States |

Two sheets change the tokens for a whole area, so every component recolours itself:

- `.campo-tinta`: ink becomes the ground (the closing call, the footer, one "how it works" panel).
- `.hoja-clara`: the same inks on a paler sheet (`#F3ECFF`) for the screens people work in: panels,
  request threads, onboarding.

Tailwind reads the tokens with `@theme inline`, so a sheet that redefines `--fondo` also changes
`bg-fondo`, `text-tinta` and the rest inside it.

## Type

- **Unbounded 800**, uppercase, tracking -0.04em, leading 0.86–0.92: the poster voice (`.type-poster`)
  and headings (`.type-heading`, sentence case, -0.03em).
- **Onest 400/500/600**: everything people read. Body 17–19px, leading 1.5.
- The monument (`Monument`) is real text fitted to the width of its container: one line up to about 12
  characters, two balanced lines beyond. Group names, the verbs and the footer wordmark use it.

## Pictures

Real photographs of each group come from its own gallery. Until a group has photos, it shows a flag of
papel picado drawn in code (`PapelPicado`): never a stock photo pretending to be the group. Archival
pictures of the world around the groups (open collections, credited) are pending: the environment's
network blocks those sources for now.

## Rules

- Headlines two lines or fewer at every width. No eyebrows above headings, no monospace, no index
  numbers, no hairlines, no gradients, no shadows at rest, no glass.
- Surfaces are separated by a step in tone, never by a line.
- Square corners everywhere; buttons are flat rectangles, 56px tall for the primary action.
- Running text is in the full ink; `tinta-2` is for secondary notes.
- Working screens (`.hoja-clara`) keep headings at 32–48px and put colour on data, not chrome.

## Motion

Transform and opacity only, and nothing travels under `prefers-reduced-motion`.

- The signature move: the poster's name settles back a few percent as the first screen leaves
  (`.monument-scroll`, a scroll-driven animation with a static fallback).
- The poster reprints with a short rise when the date or the group changes (`.cartel-swap`).
- Sections enter part by part (`data-reveal`, staggered 80ms). Content is only hidden once the script
  has run, so it never stays invisible.
- Papel picado sways from its string (`.papel-sway`).
- Every control answers press, hover and focus.
