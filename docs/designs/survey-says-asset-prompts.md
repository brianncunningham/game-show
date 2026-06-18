# Survey Says Design Asset Generation Prompts

This document contains individual prompts for generating modular design assets for the Survey Says game show interface. Copy each prompt separately to ChatGPT or your preferred AI image generator.

**Design Language:** Match a premium modern survey-based game show interface with deep navy, electric blue, purple, gold, red, and cyan neon accents. Clean broadcast graphics, glossy texture, subtle halftone detail, transparent background where applicable.

**Important:** Generate decorative frames, fills, and icons WITHOUT baked-in text (except the SURVEY SAYS emblem). All dynamic content (scores, names, questions, answers) will be rendered by React/MUI.

**Display Target:** Assets will be used in a fixed 1920x1080 game stage that scales proportionally to fit browser viewport (fullscreen on laptop or mirrored to TV). Not traditional responsive web layout.

**Transparency Note:** For all transparent PNG assets, preserve clean alpha edges and avoid rectangular background boxes. Glows and effects should fade naturally to full transparency.

---

## 1. SURVEY SAYS Emblem

**Filename:** `survey-says-emblem.png`

```
Create a "SURVEY SAYS" logo emblem for a modern survey-based game show. The design should be:
- Horizontal oval/ellipse shape, approximately 800x300 pixels
- Gold/yellow color scheme (#f5c518)
- Text "SURVEY SAYS" in bold, condensed sans-serif font, centered
- Surrounded by a ring of 24 discrete marquee light bulbs evenly spaced around the perimeter
- Each bulb should be a small glowing circle with a warm yellow/white glow
- Dark purple/navy background inside the oval (#1a0e30)
- Multiple layered neon glow effects on the border (inner glow, outer glow, bright highlights)
- Las Vegas marquee / broadcast game show aesthetic
- Transparent background outside the oval
- Export as high-resolution PNG with transparency (2x resolution for retina displays)
```

---

## 2. Question Panel Border

**Filename:** `question-panel-border.png`

```
Create a rectangular border frame for a survey-based game show question display:
- Dimensions: 1400x300 pixels
- Rounded corners (medium radius)
- Gold/yellow neon border (#f5c518) with 3-4 pixel thickness
- Multiple layered glow effects: tight inner glow, medium outer glow, wide ambient glow
- The center should be completely transparent (content will be layered behind)
- Leave generous interior padding visually clear so live text can be placed inside without overlapping glow or border effects
- Include subtle highlights on the top edge of the border
- Broadcast game show / neon sign aesthetic
- NO text, NO icons inside the frame
- Export as PNG with transparency
```

---

## 3. Score Panel Borders (Active States)

**Filenames:** `score-panel-cyan-active.png` and `score-panel-orange-active.png`

```
Create rectangular border frames for active team score displays in a survey-based game show:
- Dimensions: 400x280 pixels
- Rounded corners (medium radius)
- Neon border with 4 pixel thickness (create separate versions: cyan #00e5ff and orange #ff6a00)
- ACTIVE state: Multiple intense layered glow effects (tight inner glow, medium outer glow, wide ambient glow)
- Bright, pulsing appearance suggesting the team is currently playing
- The center should be completely transparent
- Leave generous interior padding visually clear so live text (team name, score) can be placed inside without overlapping glow or border effects
- Include bright highlights on the edges
- Broadcast game show / neon sign aesthetic
- NO text, NO scores inside the frame
- Export as PNG with transparency (create both cyan and orange versions separately)
```

---

## 4. Score Panel Borders (Inactive States)

**Filenames:** `score-panel-cyan-inactive.png` and `score-panel-orange-inactive.png`

```
Create rectangular border frames for inactive team score displays in a survey-based game show:
- Dimensions: 400x280 pixels
- Rounded corners (medium radius)
- Neon border with 2 pixel thickness (create separate versions: cyan #00e5ff and orange #ff6a00)
- INACTIVE state: Subtle glow effects, much dimmer than active state
- Muted appearance, approximately 40% opacity compared to active state
- The center should be completely transparent
- Leave generous interior padding visually clear for live text
- Minimal highlights
- Broadcast game show / neon sign aesthetic
- NO text, NO scores inside the frame
- Export as PNG with transparency (create both cyan and orange versions separately)
```

---

## 5. Answer Slot Border (Unrevealed)

**Filename:** `answer-slot-border.png`

```
Create a horizontal rectangular border frame for unrevealed answer slots in a survey-based game show:
- Dimensions: 900x120 pixels
- Rounded corners (small radius)
- Gold/yellow neon border (#f5c518) with 2 pixel thickness
- Subtle glow effect (dimmer than main panels)
- The center should be completely transparent
- Leave interior padding clear for number badge, answer text, and point value
- Clean, simple design
- Broadcast game show aesthetic
- NO text, NO numbers, NO answer content
- Export as PNG with transparency
```

---

## 6. Answer Slot Border (Revealed)

**Filename:** `answer-slot-border-revealed.png`

```
Create a horizontal rectangular border frame for revealed answer slots in a survey-based game show:
- Dimensions: 900x120 pixels
- Rounded corners (small radius)
- Gold/yellow neon border (#f5c518) with 2-3 pixel thickness
- Brighter glow effect than unrevealed state
- Inner glow and outer glow layers
- The center should be completely transparent
- Leave interior padding clear for number badge, answer text, and point value
- Broadcast game show aesthetic
- NO text, NO numbers, NO answer content
- Export as PNG with transparency
```

---

## 7. Answer Slot Border (Active/Selected)

**Filename:** `answer-slot-border-active.png`

```
Create a horizontal rectangular border frame for an active/selected answer slot in a survey-based game show:
- Dimensions: 900x120 pixels
- Rounded corners (small radius)
- Gold/yellow neon border (#f5c518) with brighter glow than revealed state
- Add subtle animated-style light sweep/highlight along the top edge
- Multiple intense glow layers
- The center should be completely transparent
- Leave interior padding clear for number badge, answer text, and point value
- Broadcast game show aesthetic
- NO text, NO numbers, NO answer content
- Export as PNG with transparency
```

---

## 8. Answer Number Badge

**Filename:** `answer-number-badge.png`

**CRITICAL:** Empty circular frame ONLY. No number, no digit, no text inside.

```
Create only an empty circular number badge frame for a survey-based game show answer slot. Dimensions 120x120 pixels. Circular metallic gold rim #f5c518 with dark navy transparent or semi-transparent center suitable for live number text added later. Subtle inner glow and outer glow, premium metallic/glossy finish, transparent background. No number, no digit, no text, no symbol, no placeholder content inside the center. The center must remain empty for React/MUI to render numbers 1-8 on top. Broadcast game show aesthetic. Export as PNG with transparency.
```

---

## 9. Vertical Bulb Light Strip (Red)

**Filename:** `bulb-strip-red.png`

```
Create a vertical strip of 8 glowing light bulbs for a survey-based game show set:
- Vertical arrangement, evenly spaced
- Each bulb is a circular light, approximately 40x40 pixels
- Red/warm color (#ff2d2d)
- Each bulb has a radial glow effect (bright center, soft outer glow)
- Slight variation in brightness between bulbs to suggest pulsing
- Total dimensions: approximately 80x800 pixels
- Transparent background
- Broadcast game show / theater marquee aesthetic
- Export as PNG with transparency
```

---

## 10. Vertical Bulb Light Strip (Blue)

**Filename:** `bulb-strip-blue.png`

```
Create a vertical strip of 8 glowing light bulbs for a survey-based game show set:
- Vertical arrangement, evenly spaced
- Each bulb is a circular light, approximately 40x40 pixels
- Blue/cyan color (#2d9bff)
- Each bulb has a radial glow effect (bright center, soft outer glow)
- Slight variation in brightness between bulbs to suggest pulsing
- Total dimensions: approximately 80x800 pixels
- Transparent background
- Broadcast game show / theater marquee aesthetic
- Export as PNG with transparency
```

---

## 11. Dark Panel Fill Texture

**Filename:** `panel-fill-dark.png`

**CRITICAL:** This is a fill texture ONLY, not a border or frame. No gold, no outline, no rim.

```
Create only a dark rectangular fill texture, not a border or frame. No gold, no outline, no rim, no border, no text, no icons. Dimensions 1024x512 pixels. Dark navy base color #05071a, subtle blue radial glow in the center, very subtle halftone dot texture overlay, slight glossy vignette with darker edges and a slightly lighter center. This is meant to sit behind live text and underneath separate border assets. Export as PNG. Absolutely no border, no frame, no glowing outline, no text, no icons.
```

---

## 12. Halftone Background Texture

**Note:** AI generators may struggle with truly seamless tiles. If the generated texture has visible seams, fall back to CSS:
```css
background-image: radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px);
background-size: 8px 8px;
```

**Filename:** `halftone-texture.png`

```
Create a seamless tileable halftone dot pattern texture for a survey-based game show background:
- Dark navy blue base color (#05071a)
- Small white/light blue dots arranged in a regular grid pattern
- Dots should be subtle but visible (approximately 10-12% opacity)
- Dot spacing: 6-8 pixels
- Dimensions: 256x256 pixels (MUST be seamless/tileable)
- Should create a retro TV screen / printing press halftone effect
- Export as PNG with the pattern ready to tile/repeat seamlessly
```

---

## 13. Strike X Mark (Active)

**Filename:** `strike-x-active.png`

```
Create a large X symbol for an active strike indicator in a survey-based game show:
- Bold, thick X shape
- Red color (#ff2020) with intense glow effect
- Dimensions: 120x120 pixels
- Multiple glow layers (inner bright glow, outer soft glow)
- Slightly rough/energetic edge quality
- Transparent background
- Broadcast game show / buzzer aesthetic
- Export as PNG with transparency
```

---

## 14. Strike X Mark (Inactive)

**Filename:** `strike-x-inactive.png`

```
Create a large X symbol for an inactive/future strike indicator in a survey-based game show:
- Bold, thick X shape
- Dark gray color (#666666) with minimal glow
- Dimensions: 120x120 pixels
- Very subtle glow (much dimmer than active state)
- Approximately 30% opacity
- Transparent background
- Broadcast game show aesthetic
- Export as PNG with transparency
```

---

## 15. Background Studio Set

**Filename:** `studio-background.png`

```
Create a background image for a modern survey-based game show set:
- Dimensions: 1920x1080 pixels
- Dark navy blue base (#05071a)
- Angled perspective walls suggesting a 3D TV studio set
- Halftone dot texture throughout (subtle but visible)
- Ambient lighting: magenta/purple glow on the left side, cyan/blue glow on the right side
- Rich, saturated color pools in the corners
- Subtle gradient from darker at edges to slightly lighter in center
- Broadcast game show studio / stage lighting aesthetic
- Should feel dimensional and atmospheric, not flat
- NO text, NO logos, NO UI elements
- Export as high-quality PNG
```

---

## 16. Multiplier Chevron Banner

**Filename:** `multiplier-banner.png`

**CRITICAL:** Empty banner frame ONLY. No text like "TRIPLE POINTS" or "2X" inside.

```
Create a chevron/hexagon shaped banner frame for a survey-based game show multiplier display. Horizontal banner with pointed left and right ends (like an arrow pointing both ways). Dimensions approximately 600x180 pixels. Gold/yellow color scheme #f5c518 with double border effect (inner and outer gold outlines). The center should be dark purple #1a0e30 with subtle halftone texture. Layered glow effects on the borders. The center area must remain completely empty - text will be added by React/MUI. Broadcast game show / prize banner aesthetic. Transparent background outside the banner shape. No text, no numbers, no multiplier labels, no "TRIPLE POINTS", no "2X", no placeholder content inside the banner. Export as PNG with transparency.
```

---

## 17. Round Total Panel Border

**Filename:** `round-total-border.png`

**CRITICAL:** Border frame ONLY. No "ROUND TOTAL" text or numbers inside.

```
Create a rectangular border frame only for the round total display in a survey-based game show. Dimensions 400x180 pixels. Rounded corners (medium radius). Cyan/blue neon border #4fc3f7 with 2-3 pixel thickness. Moderate glow effects (inner and outer glow). The center should be completely transparent. Leave interior padding clear for live text. Broadcast game show aesthetic. No text, no numbers, no labels, no "ROUND", no "TOTAL", no placeholder content inside the frame. Export as PNG with transparency.
```

---

## 18. Strikes Panel Border

**Filename:** `strikes-panel-border.png`

**CRITICAL:** Border frame ONLY. No "STRIKES" text or X marks inside.

```
Create a rectangular border frame only for the strikes display in a survey-based game show. Dimensions 360x180 pixels. Rounded corners (medium radius). Magenta/purple neon border #d946ef with 2-3 pixel thickness. Moderate glow effects (inner and outer glow). The center should be completely transparent. Leave interior padding clear for live content. Broadcast game show aesthetic. No text, no X marks, no symbols, no "STRIKES" label, no placeholder content inside the frame. Export as PNG with transparency.
```

---

## 19. Major Alert Overlay Frame

**Filename:** `alert-overlay-major.png`

**Use Case:** Buzzer winner announcements, steal opportunities, major game state changes

**CRITICAL:** Empty overlay frame ONLY. No text like "BUZZED IN" or team names inside.

```
Create a wide lower-third alert frame only for a survey-based game show major announcement. Dimensions 1100x220 pixels. Futuristic broadcast lower-third shape with angled edges or dynamic side accents. Gold and electric red/cyan neon accents. Dark navy transparent/semi-transparent center suitable for live text overlay added later. Strong glow and energetic highlight streaks suggesting urgency/excitement. Premium broadcast graphics aesthetic. No text, no icons, no names, no "BUZZED IN", no "STEAL", no team names, no placeholder content. Transparent background outside the frame. Export as PNG with transparency.
```

---

## 20. Lower-Third Prompt Overlay Frame

**Filename:** `prompt-overlay-lower-third.png`

**Use Case:** Next player indicator, turn prompts, minor status updates

**CRITICAL:** Empty overlay frame ONLY. No text like "NEXT GUESS" or player names inside.

```
Create a compact lower-third prompt frame only for a survey-based game show player turn indicator. Dimensions 900x160 pixels. Clean rounded rectangular frame with subtle angled side accents. Gold, cyan, and purple neon border. Dark navy transparent/semi-transparent center suitable for live text overlay added later. Moderate glow, less intense than major alert. Broadcast lower-third / chyron aesthetic. No text, no icons, no names, no "NEXT GUESS", no "YOUR TURN", no player names, no placeholder content. Transparent background outside the frame. Export as PNG with transparency.
```

---

## Asset Organization

Once generated, save all assets to:
```
/Users/briancunningham/CascadeProjects/game-show/public/survey-says/
```

Suggested directory structure:
```
public/
  survey-says/
    emblem/
      survey-says-emblem.png
    borders/
      question-panel-border.png
      score-panel-cyan-active.png
      score-panel-cyan-inactive.png
      score-panel-orange-active.png
      score-panel-orange-inactive.png
      answer-slot-border.png
      answer-slot-border-revealed.png
      answer-slot-border-active.png
      answer-number-badge.png
      round-total-border.png
      strikes-panel-border.png
      multiplier-banner.png
    decorations/
      bulb-strip-red.png
      bulb-strip-blue.png
      strike-x-active.png
      strike-x-inactive.png
    overlays/
      alert-overlay-major.png
      prompt-overlay-lower-third.png
    backgrounds/
      studio-background.png
      panel-fill-dark.png
      halftone-texture.png
```

---

## Complete Asset Checklist

Use this checklist when generating assets:

**Emblem (1 asset):**
- [ ] survey-says-emblem.png

**Borders (12 assets):**
- [ ] question-panel-border.png
- [ ] score-panel-cyan-active.png
- [ ] score-panel-cyan-inactive.png
- [ ] score-panel-orange-active.png
- [ ] score-panel-orange-inactive.png
- [ ] answer-slot-border.png
- [ ] answer-slot-border-revealed.png
- [ ] answer-slot-border-active.png
- [ ] answer-number-badge.png
- [ ] round-total-border.png
- [ ] strikes-panel-border.png
- [ ] multiplier-banner.png

**Decorations (4 assets):**
- [ ] bulb-strip-red.png
- [ ] bulb-strip-blue.png
- [ ] strike-x-active.png
- [ ] strike-x-inactive.png

**Overlays (2 assets):**
- [ ] alert-overlay-major.png
- [ ] prompt-overlay-lower-third.png

**Backgrounds (3 assets):**
- [ ] studio-background.png
- [ ] panel-fill-dark.png
- [ ] halftone-texture.png

**Total: 22 assets**

---

## Usage Notes

- All assets should have **transparent backgrounds** except studio-background.png and panel-fill-dark.png
- Use **high resolution** (2x or higher) for crisp display on retina screens
- PNG format should use **alpha transparency** for proper layering
- Test assets at different screen sizes to ensure proper scaling
- Assets are designed to be **layered**: background → fill → border → text content
- No text should be baked into assets except the SURVEY SAYS emblem

## Implementation Strategy

### Fixed 16:9 Game Stage (Recommended)

Build the game interface as a **fixed 1920x1080 composition** that scales proportionally to fit the viewport:

```jsx
<Box className="screenWrapper">
  <Box className="gameStage" style={{ transform: `scale(${scale})` }}>
    {/* All positioned UI at 1920x1080 coordinates */}
  </Box>
</Box>
```

```css
.screenWrapper {
  width: 100vw;
  height: 100vh;
  background: black;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gameStage {
  width: 1920px;
  height: 1080px;
  transform-origin: center center;
}
```

```js
const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
```

This ensures consistent layout whether fullscreen on a laptop or mirrored to a TV. **Do not use traditional responsive web layout** — the game board should behave like a broadcast graphic that scales proportionally, not reflows.

### Asset Layering

Assets will be used in a layered approach:

```jsx
<Box className="scorePanel">
  {/* Layer 1: Dark fill */}
  <img src="/survey-says/backgrounds/panel-fill-dark.png" className="panelFill" />
  
  {/* Layer 2: Border frame (active or inactive) */}
  <img src={active ? "/survey-says/borders/score-panel-cyan-active.png" : "/survey-says/borders/score-panel-cyan-inactive.png"} className="panelBorder" />
  
  {/* Layer 3: Dynamic content (MUI/React) */}
  <Typography className="teamName">{team.name}</Typography>
  <Typography className="teamScore">{team.score}</Typography>
</Box>
```

This approach maintains flexibility while achieving the polished AI-generated aesthetic.

### Dynamic Overlays (Not Baked Into Base Board)

Game state elements should be rendered as **temporary overlays** on top of the stable board:

```jsx
<GameStage>
  <StudioBackground />
  <MainBoard />
  <ScorePanels />
  <BottomModules />

  {/* Dynamic overlays - shown/hidden based on game state */}
  {buzzWinner && (
    <Box className="majorAlertOverlay" sx={{ pointerEvents: 'none' }}>
      <img
        src="/survey-says/overlays/alert-overlay-major.png"
        className="overlayFrame"
        alt=""
      />
      <Box className="overlayContent">
        <Typography className="overlayLabel">
          {buzzWinner.teamName} BUZZED IN
        </Typography>
        <Typography className="overlayName">
          {buzzWinner.playerName}
        </Typography>
      </Box>
    </Box>
  )}

  {nextPlayer && (
    <Box className="lowerThirdPrompt" sx={{ pointerEvents: 'none' }}>
      <img
        src="/survey-says/overlays/prompt-overlay-lower-third.png"
        className="overlayFrame"
        alt=""
      />
      <Box className="overlayContent">
        <Typography className="overlayLabel">NEXT GUESS</Typography>
        <Typography className="overlayName">
          {nextPlayer.playerName}
        </Typography>
      </Box>
    </Box>
  )}
</GameStage>
```

**Use overlays for:**
- Buzzer winner announcements
- Next player/turn indicators
- Steal opportunities
- Pass or Play prompts
- Correct/Wrong feedback
- Countdown/lockout status
- Temporary transitions

**Keep on the base board:**
- Active team glow (score panel state)
- Side lighting effects
- Persistent UI elements

This keeps the main board stable while allowing dynamic game state to appear/disappear cleanly with animations.

## Suggested Generation Batches

Generate assets in small batches instead of all at once. This makes it easier to check consistency, transparency, and usability before continuing.

### Batch 1: Visual Foundation
- studio-background.png
- survey-says-emblem.png
- panel-fill-dark.png

### Batch 2: Main Board Frames
- question-panel-border.png
- answer-slot-border.png
- answer-slot-border-revealed.png
- answer-slot-border-active.png
- answer-number-badge.png

### Batch 3: Team Score Panels
- score-panel-cyan-active.png
- score-panel-cyan-inactive.png
- score-panel-orange-active.png
- score-panel-orange-inactive.png

### Batch 4: Bottom / Status Modules
- multiplier-banner.png
- round-total-border.png
- strikes-panel-border.png
- strike-x-active.png
- strike-x-inactive.png

### Batch 5: Set Decorations and Overlays
- bulb-strip-red.png
- bulb-strip-blue.png
- alert-overlay-major.png
- prompt-overlay-lower-third.png

### Batch 6: Optional Texture
- halftone-texture.png

Note: The halftone texture may be better implemented in CSS if the generated asset is not truly seamless.

---

## Batch 7: Regenerated Assets (Transparency & Proportion Fixes)

The following assets need to be regenerated to fix transparency issues and incorrect dimensions discovered during implementation.

Generate one at a time and inspect before proceeding to the next.

---

### 7.1 — survey-says-emblem.png (REPLACE)

**Save to:** `public/survey-says/emblem/survey-says-emblem.png`

**Required dimensions:** 1200 × 600 pixels (2:1 landscape ratio)

**Prompt:**
A broadcast game show marquee emblem for "SURVEY SAYS". The emblem is a wide horizontal oval/ellipse shape with a ring of round incandescent marquee bulbs around the outer edge — the bulbs are glowing warm white/yellow. Inside the oval is a dark navy-to-black fill with a subtle purple glow. The text "SURVEY SAYS" is rendered in large, bold, gold/amber 3D letters with strong drop shadow and inner glow. The overall style is neon Vegas/TV game show.

CRITICAL — TRANSPARENCY:
- The image MUST be saved as RGBA PNG with a fully transparent background
- ONLY the oval emblem shape, bulbs, and text should be opaque
- All pixels outside the oval must be fully transparent (alpha = 0)
- DO NOT use a white, gray, checkered, or any solid background
- The glow around the oval may have soft semi-transparent edges — this is correct
- Test: when placed over a dark blue background, only the emblem should be visible

---

### 7.2 — panel-fill-dark.png (REPLACE)

**Save to:** `public/survey-says/backgrounds/panel-fill-dark.png`

**Required dimensions:** 1200 × 600 pixels (2:1 landscape ratio, matches border PNGs)

**Prompt:**
A dark navy blue rectangular fill texture for a broadcast game show UI panel. The fill is a rich dark navy blue (#05071a) with a subtle radial glow toward the center — slightly brighter navy in the middle, darker at edges. A very faint halftone dot grid pattern is visible at low opacity (~15%). No border. No glow on the edges. Edge-to-edge solid fill with no transparency — this image will be used as a background layer underneath a transparent-center border frame.

CRITICAL:
- This image has NO transparent pixels — it is a fully opaque rectangular fill
- Save as RGBA PNG but all alpha values must be 255 (fully opaque)
- Dimensions must be exactly 1200 × 600 pixels
- NO border, NO frame edge, NO rounded corners — pure flat fill that bleeds to every edge
- No text, no numbers, no symbols of any kind

---

### 7.3 — answer-number-badge.png (REPLACE)

**Save to:** `public/survey-says/borders/answer-number-badge.png`

**Required dimensions:** 200 × 200 pixels (square)

**Prompt:**
A circular gold badge ring for a broadcast TV game show answer board. The badge is a perfect circle: a thick gold/amber metallic outer ring with a subtle double-border inner edge and a warm glow. The interior of the circle is completely transparent — you should be able to see through the center. The ring itself has a 3D metallic sheen with highlights at the top and shadow at the bottom. The style is neon Vegas TV game show gold.

CRITICAL — TRANSPARENCY:
- Save as RGBA PNG with transparent background
- The CENTER of the circle must be fully transparent (alpha = 0)
- Only the ring/border itself should be opaque
- All pixels outside the outer ring must be fully transparent (alpha = 0)
- NO number, NO text, NO digit inside the ring — center must be empty
- Dimensions must be exactly 200 × 200 pixels (square)

---

### 7.4 — answer-slot-border.png (REPLACE — unrevealed state)

**Save to:** `public/survey-says/borders/answer-slot-border.png`

**Required dimensions:** 1400 × 140 pixels (10:1 wide landscape ratio)

**Prompt:**
A wide horizontal rectangular border frame for a broadcast TV game show answer slot — unrevealed/empty state. The frame is very wide and short (approximately 10:1 aspect ratio). The border is a double-line gold/amber metallic frame with a subtle warm glow. The interior of the frame is completely transparent. The corners are slightly rounded. The overall appearance is dim/inactive — the gold border has moderate brightness, no intense glow, suggesting the answer has not yet been revealed.

CRITICAL — TRANSPARENCY:
- Save as RGBA PNG with transparent background
- The INTERIOR of the rectangle must be fully transparent (alpha = 0)
- Only the border frame itself should be opaque/semi-opaque
- All pixels outside the outer border must be fully transparent (alpha = 0)
- NO text, NO numbers, NO fill inside — transparent center only
- Dimensions must be exactly 1400 × 140 pixels

---

### 7.5 — answer-slot-border-revealed.png (REPLACE — revealed state)

**Save to:** `public/survey-says/borders/answer-slot-border-revealed.png`

**Required dimensions:** 1400 × 140 pixels (10:1 wide landscape ratio)

**Prompt:**
A wide horizontal rectangular border frame for a broadcast TV game show answer slot — revealed/active state. Same shape as the unrevealed version (very wide, short, 10:1 ratio, slightly rounded corners) but with a brighter, more intense gold/amber glow. The border has a strong neon gold shine with layered highlights and a warm outer glow suggesting an active/revealed answer. The interior is completely transparent.

CRITICAL — TRANSPARENCY:
- Save as RGBA PNG with transparent background
- The INTERIOR of the rectangle must be fully transparent (alpha = 0)
- Only the glowing border frame itself should be opaque/semi-opaque
- All pixels outside the outer border must be fully transparent (alpha = 0)
- NO text, NO numbers, NO dark fill inside — transparent center only
- Dimensions must be exactly 1400 × 140 pixels