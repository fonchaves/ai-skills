# Frames, platform chrome, and the vertical budget

## Frame presets

| Device | Frame | Top chrome | Bottom chrome |
|---|---|---|---|
| iPhone 15/16 Pro | 393 × 852 | status bar 54 (Dynamic Island) | home indicator area 34 |
| iPhone 16 Pro Max | 440 × 956 | 54 | 34 |
| iPhone SE | 375 × 667 | 20 | none |
| Android compact (Pixel) | 412 × 915 | ~24–32 (approx.) | gesture area ~24 (approx.) |
| iPad Air / Pro 11" | 820 × 1180 / 834 × 1194 | 24 | 20 |
| Desktop | 1440 × 1024 (or 1440 × 900, 1280 × 800) | none | none |

iOS details that make a mock read as real: time `09:41` in semibold ~15 px at the left; cellular
bars, Wi-Fi and battery at the right, drawn as shapes (the battery is a stroked rounded rect, a
fill, and a small cap). Tab bar ≈ 49 + 34 = 83 px. The home indicator is a 134 × 5 bar, radius 3,
about 8 px above the bottom edge, ~30% of the text colour.

## The vertical budget

Before drawing, write the whole stack with every block and every gap, and make it sum to the frame
height exactly. The cost of skipping this is re-flowing 150 shapes by a few pixels, repeatedly.

A worked example, a 393 × 852 mobile dashboard:

```
status bar           0 –  54    54
header              54 – 106    52
  gap                            6
search             112 – 156    44
  gap                           10
hero card          166 – 330   164
  gap                           10
section label      340 – 352    12
  gap                            6      label hugs its group
tile grid 2×2      358 – 492   134      62 + 10 + 62
  gap                           16      sections breathe more than items
section header     508 – 527    19
  gap                            8
feed (3 cards)     535 – 769   234      82 + 8 + 72 + 8 + 64, heights follow content
  gap                            7
bottom nav         776 – 852    76
                              ----
                               852
```

When it doesn't fit, decide on paper what gives: shorter cards, one line less of copy, a tighter
tile row, or letting the last card scroll under the nav (then say so, and don't pretend it all
fits). Only then draw.

## Spacing rules that kept coming up

- **Proximity**: a section label sits closer to the group it labels than to the block above it.
  Equal spacing on both sides reads as "belongs to neither".
- **Sections separate by more than their items do** (16 between sections, 8–10 between items).
- **Card height follows content.** A card with a one-line subtitle is shorter than one with two;
  forcing equal heights leaves a hole in the short one.
- **Measure text instead of estimating.** Localised copy (Portuguese, German) runs 20–30% longer
  than the English you'd guess from. Create, `await h.sleep(150)`, read `textBounds.width`, then
  place the neighbour. A long placeholder in a search field was 11 px over budget at 11 px, and fit
  at 10.5 px.
- **Two things wanting the same corner**: an action link and a status chip can't both be
  top-right. Give the chip the corner and move the action under the text.

## Floating elements

A FAB is 56 px, 20 px from the side, 16 px above the nav. It floats over content, so keep the text
of whatever card sits under it clear of its box (text right edge < FAB x − 8): narrow that card's
text column, and don't put a chip in that card's top-right corner.

## Layout containers

- **Grid** for tile grids: explicit cells, and positions survive componentizing and reordering.
  `g.addRow("fixed", 62)` per row, `g.addColumn("flex", 1)` per column,
  `g.appendChild(tile, row, col)`.
- **Flex column** for feeds and lists: `dir = "column"`, `rowGap`, sized children set to
  `layoutChild.verticalSizing = "fix"`. Change a card's height and the ones below reflow; their
  contents move with them.
- Everything else (a card's insides, a header) is simpler absolutely positioned inside a named
  board. Wrap each section in its own board so it can be moved, cloned or componentized as a unit.
