# NitroGroups — Design system

Durable visual decisions for the web app. Product truth lives in the root `README.md`;
this file owns the look. Change it deliberately, not per page.

## Brief

NitroGroups is a marketplace in Mexico (prices in MXN) where people planning an event —
a wedding, a quinceañera, a corporate party — find a live music group, check its
availability and send a booking request. Groups manage their profile, media and calendar.

- **Client job:** find a group that fits the event, date and budget, and ask for it with confidence.
- **Group job:** look professional enough to be hired, and keep the calendar straight.
- **Direction chosen by the owner:** *"Escenario nocturno premium"* — deep dark ground,
  one warm stage-light accent, large editorial type, the groups' photos as the protagonists.

## The world

The night stage of a Mexican salón de eventos, seen through the poster tradition that sells it:
the *cartel* — huge condensed letters announcing who plays, where and when. The page is the
poster; the groups are the headliners; the only light is a tungsten follow-spot.

- **Ground — telón (velvet curtain):** a deep oxblood, not black. Dark because the scene is a
  night stage, warm because tungsten light is warm.
- **Light — tungsteno:** one amber accent, used for the primary action and the current state.
  Nothing else is amber.
- **Ink — papel:** warm off-white for all running text. No grey body copy.

## Tokens

| Token | Hex | Role | Contrast |
| --- | --- | --- | --- |
| `telon` | `#1C0B0E` | Page ground | — |
| `telon-2` | `#2A1216` | Raised surface (panels, inputs) | — |
| `telon-3` | `#3A1A1F` | Hover / selected surface | — |
| `papel` | `#F4EADF` | Text, headings | 16.0:1 on telon |
| `papel-2` | `#D9C7B8` | Secondary text | 11.6:1 on telon |
| `tungsteno` | `#F5A524` | Primary action, focus, current item | 9.3:1 on telon |
| `error` | `#FF8A7A` | Errors | 8.3:1 on telon |

Surfaces are separated by a step in tone (`telon` → `telon-2` → `telon-3`), never by a shadow
or a hairline. Shadows exist only on things that float (menus, dialogs).

## Type

One family: **Archivo** (variable, width axis 62–125). Its condensed widths are the poster voice;
its normal width is the reading voice. One family keeps the page coherent; the width axis
gives the contrast that usually needs a second typeface.

| Role | Setting |
| --- | --- |
| Display (poster) | Archivo, `wdth` 62, weight 800, tracking -0.03em, leading 0.9, up to `clamp(3.5rem, 11vw, 9.5rem)` |
| Heading | Archivo, `wdth` 75, weight 700, tracking -0.02em |
| Body | Archivo, `wdth` 100, weight 400, 17px / 1.55, 45–70ch |
| Small | Archivo, `wdth` 100, weight 500, 14px, sentence case |

Five sizes per page at most. Numbers that align (prices, dates) use tabular figures.

## Layout

- One 12-column grid, outer margins `clamp(1rem, 4vw, 3rem)`, equal on both sides.
- Left-aligned. Centre at most one moment per page.
- Gaps between sections (`clamp(6rem, 14vw, 13rem)`) are clearly larger than any gap inside a section.
- Neighbouring sections never share a composition. No rows of identical cards.
- Group photos are square-cornered and large; one dominant image beats a grid of small ones.

## Components

- **Button:** flat, square corners, one fill. Primary is tungsteno on telon ink; secondary is
  papel text on `telon-2`. Labels name the action ("Buscar grupos", "Enviar solicitud").
- **Inputs:** `telon-2` fill, no border at rest, a 2px tungsteno ring on focus, label above,
  limits stated beside the field and tied with `aria-describedby`.
- **Navigation:** wordmark, three plain links, one action. No pill bar, no blur.
- **Focus:** 2px tungsteno outline with 3px offset on every interactive element.
- **Selection / caret / scrollbar:** themed from the palette.

## Motion

One authored moment per page: the hero headline's width eases from 100 to 62 on first paint
(the poster "tightening"), skipped under `prefers-reduced-motion`. Everything else moves only
in answer to the user (menus opening, a request being sent).

## Refused on purpose

These were the rut for this category, and are kept out:

- Violet / indigo / lilac accents (the previous theme and the category default for "music" and "events").
- Cream ground with terracotta; near-black with one acid accent.
- Eyebrow labels, pill badges, emoji, gradient text, an accent word inside a headline.
- Invented vanity numbers ("500+ artistas").
- Glass, glows, gradients as decoration, soft rounded cards with grey shadows.
- Monospace as a "tech" costume; numbered 01/02/03 markers for content that is not a sequence.

## Review against the brief (second pass)

The first plan used a near-black ground (`#0E0C0B`) with an amber accent and Bebas Neue.
Checked against a similar prompt, that lands on two generic defaults: "near-black + one bright
accent" and Bebas Neue, which the UI/UX Pro Max data lists as the stock "bold statement" pairing.
Revised: the ground became oxblood *telón* (it names the actual material of the scene) and the
display face became Archivo condensed, one family carrying both voices. The amber stayed:
it is the literal colour of the light the brief asks for.
