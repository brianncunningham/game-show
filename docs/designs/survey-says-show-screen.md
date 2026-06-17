# Survey Says — /show Screen Design Reference

## Reference Image
`docs/designs/survey-says-show-screen-reference.png`

---

## Design Prompt

Create a detailed graphic design of a modern survey-based game show interface, presented as a clean widescreen 16:9 digital display mockup. The screen layout features clearly defined, separate modules against a vibrant background of deep blue and purple geometric facets, with clean lines, glowing accents, and premium broadcast-style high-tech textures.

At the top center, include a polished game title badge that reads "SURVEY SAYS" in bold gold-and-white game show lettering. Do not use the words "Family Feud."

---

## Layout Breakdown

### Top Row (3 modules)

**Left — Family 1 Score Panel**
- Compact rectangular panel, neon red border
- Displays team name and score (e.g. "FAMILY 1" / "145")
- **Active team**: stronger glow, brighter edge highlights, subtle light rays
- Active status communicated through glow/lighting only — no text, labels, icons, or arrows

**Center — Question Panel**
- Primary text panel
- Question text in large, clear, professional white sans-serif font (all caps)
- e.g. "NAME SOMETHING YOU BRING TO A PICNIC"

**Right — Family 2 Score Panel**
- Compact rectangular panel, neon blue border
- Displays team name and score (e.g. "FAMILY 2" / "88")
- Polished but less active than Family 1 when Family 1 is guessing

---

### Center — Answer Board

Large two-column grid of up to 8 numbered answer slots.

**Revealed slot:** number icon (gold circle) + answer text (left-aligned, white) + point value (right-aligned, gold)
**Unrevealed slot:** large gold number only, no text

- No dotted leader lines between answer and score
- Consistent modern border style, vibrant gold text
- Slots numbered 1–4 in left column, 5–8 in right column

---

### Bottom Row (3 modules)

**Left — Multiplier Panel**
- Prominent panel, gold and purple color scheme
- Text: e.g. "TRIPLE POINTS" or "DOUBLE POINTS" (no "MULT" or multiplier notation)
- Only shown when multiplier > 1x; hidden or dimmed at 1x

**Center — Round Total**
- Display box: "ROUND [N] TOTAL: [score]"

**Right — Strikes**
- Label: "STRIKES"
- Three circular X icons
- Active strikes: red X; inactive: gray X

---

## Lighting / Visual Notes

- Active team side of screen: slightly brighter, warmer overall glow
- Inactive modules: dimmer but still crisp
- Small subtle corner glow icon (understated)
- Strong readability, consistent spacing, premium live broadcast feel
- Background: deep blue and purple geometric facets

---

## Implementation Notes (for when we build this)

- Team colors: Family 1 = cyan (`#00e5ff`), Family 2 = orange (`#ff6a00`) — fixed, not configurable
- Gold accent: `#f5c518` or similar warm gold
- Background: deep navy/purple, e.g. `#05071a` base with geometric overlay
- Font: bold sans-serif, all caps — consider Impact, Barlow Condensed, or Bebas Neue
- Answer board cells: dark panel with gold border, rounded corners
- Glow effects via CSS `box-shadow` and `text-shadow`
- Active team panel glow: pulsing or static depending on preference
