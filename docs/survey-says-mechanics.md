# Survey Says — Game Mechanics Reference

> **Status: Design/documentation only — not yet implemented.**
> Refer to NTT `/host` and `/gameadmin` pages as implementation starting points.
> Last updated: mechanics Q&A complete — ready for implementation planning.

---

## 1. Global Game Settings (`/gameadmin`)

| Setting | Type | Default | Notes |
|---|---|---|---|
| **Buzzer Mode** | Toggle | `HARDWARE` | `HARDWARE` = external input; `MANUAL` = host triggers via `/host` UI |
| **Point Multiplier Schedule** | Per-round array | `[1, 1, 2, 3]` | Maps round number → multiplier |
| **Winning Threshold** | Number | `300` | First team to reach this wins |
| **Answer Timer** | Toggle + `max_seconds` | `OFF` | If ON, countdown window per answer |
| **Sweep Bonus** | Number | `0` | Added to score if team clears full board without 3 strikes |

---

## 2. Core Game Mechanics & State Flows

### Game States

```
FACE_OFF → PLAY_OR_PASS → MAIN_PLAY → STEAL_OPPORTUNITY → ROUND_END → (next round or END_GAME)
```

---

### Face-Off Sequence & The Missed-Answer Loop

The round begins in `FACE_OFF`. One player from each team steps up.

```
[Start Face-Off]
      |
[Activate Buzzers]
      |
[Player A Buzzes In]
      |
Is Answer Correct?
   /        \
(Yes)       (No)
  |           |
Is it #1?  [Strike on Player A]
  /    \       |
(Yes) (No)  [Player B free guess]
  |     |       |
[Win] [Player B guess]  Is Correct?
       /    \          /        \
    (Yes)  (No)     (Yes)       (No)
      |      |        |           |
 Beats A?  [Win]   [Win]   [No one correct]
   /    \                        |
(Yes)  (No)              [Advance to Next Pair]
  |      |                       |
[Win]  [Win]           [Re-activate Buzzers]
                        (loop on same question)
```

**Step-by-step:**

1. **Activate Buzzers** — host reads question, clicks "Activate Buzzers". System listens for hardware buzz or manual click (Team 1 / Team 2 player buzz).

2. **First player attempt (Player A):**
   - **Correct + #1 rank** → Face-off ends immediately. Player A's team gets Play or Pass.
   - **Correct but not #1** → Player B gets a chance to guess.
   - **Incorrect** → Personal strike on Player A. Player B gets a free guess.

3. **Second player attempt (Player B):**
   - *If Player A was correct but not #1:* Player B guesses. If ranked **higher** than Player A → Player B's team wins control. If lower or wrong → Player A's team wins control.
   - *If Player A was incorrect:* Any correct answer → Player B's team wins control.

4. **Missed-Answer Loop** — if **neither** player gives a correct answer:
   - Board stays hidden. No control awarded.
   - Host clicks **"Reset Buzzers Only"** (does not clear round progress).
   - Next pair of family members steps up. Loop restarts on the same question.
   - Repeats until someone answers correctly.

5. **Play or Pass** — winning team verbally chooses. Host clicks "Play" or "Pass" → state moves to `MAIN_PLAY`.

---

### Main Play & Strike System

Controlling team guesses remaining hidden slots.

- **Correct answer:** Host clicks "Reveal [Slot #]". Points added to **Round Bank**. Team continues.
- **Wrong answer:** Host clicks "Wrong/Strike". `strike_count` increments. Strike X flashes on `/show`.
- **3 strikes:** Board locks for playing team. Moves immediately to `STEAL_OPPORTUNITY`.

---

### Steal Mechanic

Opposing team gets exactly **one collective guess**.

- **Successful steal:** Answer matches any unrevealed slot → stealing team wins the round and takes the full **Round Bank**. *(The steal answer's own point value is NOT added.)*
- **Failed steal:** Original playing team keeps the Round Bank.

---

## 3. Scoring Engine

### Formula

```
Points Awarded = (Round Bank × Current Round Multiplier) + Sweep Bonus (if applicable)
```

- **Round Bank** = sum of point values of all answers revealed before any steal attempt
- **Sweep Bonus** = added only if team clears the entire board during Main Play without reaching 3 strikes

### Round Loop

```
[Start Round]
      |
[Face-Off] ──── Both missed? ──Yes──> [Loop: next pair, re-open buzzers]
      |
      No
      |
[Main Play]
      |
3 Strikes? ──No──> Team sweeps board ──> Wins Bank + Sweep Bonus
      |
      Yes
      |
[Steal Phase] ──> Team wins Bank (or fails, original team keeps Bank)
      |
[Update Global Scores]
      |
Score >= Winning Threshold?
      |──Yes──> END_GAME → unlock Lightning Round
      |──No───> Increment Round → Load Next Board → Restart Loop
```

---

## 4. Host Interface Architecture (`/host`)

| Phase Controls | Scoring & Adjudication | Status Displays |
|---|---|---|
| **Activate Buzzers** (arm system) | **Correct Answer [1–8]** | Team 1 Score + Strikes |
| **Reset Buzzers Only** (next pair, same question) | **Wrong Answer / Strike** | Team 2 Score + Strikes |
| **Team 1 Manual Buzz** | **Award Bank to Team 1** | Current Bank |
| **Team 2 Manual Buzz** | **Award Bank to Team 2** | Multiplier + Sweep Bonus value |
| **Play** / **Pass** | | |

---

## 5. Data Format & Content Manager

### CSV Format

One line per board (question). Up to 8 answer/points pairs per line.

```
round, question, answer1, points1, answer2, points2, answer3, points3, ...
```

- **round** — integer (1-based). Boards are pre-sequenced; Round 1 = all boards tagged round 1, etc.
- **question** — survey question text (quote if it contains commas)
- **answerN** — answer text (quote if contains commas)
- **pointsN** — integer point value (derived from survey percentage, e.g. 42% → 42 pts)
- Up to 8 answer/points pairs (max 17 fields per line after round + question)
- Answers should be ordered by rank (highest points first = rank 1)

**Example:**
```
1, Name something you bring to a picnic, Sandwiches, 42, Blanket, 26, Fruit, 18, Drinks, 8, Sunscreen, 4
2, Name a reason you might be late to work, Traffic, 38, Overslept, 31, Bad weather, 15, Forgot something, 10, Car trouble, 6
```

### Parsed Data Structure (per board)

```ts
interface SurveyBoard {
  id: string;
  round: number;
  question: string;
  answers: SurveyAnswer[];  // 1–8 entries, ordered by rank
}

interface SurveyAnswer {
  rank: number;       // 1-based, derived from order in CSV
  text: string;
  points: number;
}
```

### Round Structure

- Boards are **pre-sequenced by round number** in the CSV.
- Multiple boards can be tagged to the same round (host picks from available boards for that round, same as NTT).
- Game save = full set of boards for a complete game (typically 4 rounds).
- Content manager: **CSV paste only** (no inline form editor). Same UI pattern as NTT.

---

## 6. Lightning Round (Future / TBD)

> ⚠️ Not fully designed. Revisit before Phase 5 implementation.

**Open questions:**
- How are two players from the winning team managed sequentially (Player 2 "isolated" so they don't hear duplicates)?
- Dual-timer setup: ~20s for Player 1, ~25s for Player 2
- Point target: combined 200 points to win ultimate prize
- All timers/targets should be configurable in `/gameadmin`

**Key concern:** Lightning Round may require free-text entry by the host for spoken responses — this may not be practical in a live show setting. **Needs further consideration before committing to implementation.**

---

## 6. Confirmed Design Decisions

### Board & Question Reveal Flow
- Slot count and answers are **baked into question data** (loaded per round in `/gameadmin`) — not a live host control.
- Host announces "there are X answers on the board" → clicks a button to reveal the board slots on `/show` (unused slots greyed/absent, no number shown).
- Host then clicks **"Reveal Question"** → question appears on `/show` + buzzers arm (hardware mode) or question appears and host manually selects who buzzed first (manual mode).
- In manual mode: "Reveal Question" shows the question, host uses "Team 1 Buzz" / "Team 2 Buzz" to record who answered first (hands raised, etc.).

### Host Answer Buttons
- Host always sees the full answer list as labeled buttons (e.g. "1. Sandwiches") once the board is loaded.
- Visible during face-off so host can judge correctness and click the matching slot to reveal it.
- **No text entry** — host only clicks pre-loaded answer buttons.

### Face-Off Strike
- Face-off strike is **separate** from the 3-strike Main Play counter.
- Shown as a single-strike overlay on `/show` for the face-off phase only. Clears when next pair steps up.

### Main Play
- No passing — any non-answer during Main Play is a strike. Order doesn't matter.

### Post-Round Board Reveal
- After round ends (steal success, steal fail, or sweep), host manually reveals all remaining unrevealed slots one at a time from `/host`.
- **No points awarded** during post-round reveal phase.

### Steal Answer Display
- Stolen answer **reveals on the board** visually.
- Stolen answer points are **not added** to the bank by default.
- A toggle in `/gameadmin` can optionally include the stolen answer in points awarded. Default: OFF.

### Multiplier Display
- Multiplier panel on `/show` is **hidden entirely** at 1x. Only shown when multiplier > 1x.
- Text label: "DOUBLE POINTS", "TRIPLE POINTS", etc. — no numeric notation.

### Round Bank Display
- Round total on `/show` shows the **live running bank** during play (updates as answers are revealed).

### Team Names & Colors
- Team names set in `/gameadmin` (same pattern as NTT).
- **Fixed colors:** Family 1 = `#00e5ff` (cyan), Family 2 = `#ff6a00` (orange).
- Active/guessing team's score panel glows brighter on `/show` — lighting only, no text label.

### Empty Board Slots
- Boards can have 1–8 answers. Unused slots are **absent or clearly greyed** with no number shown.

### Strike Display
- 3 circular X icons on `/show` — active strike = red X, unused = grey X.
