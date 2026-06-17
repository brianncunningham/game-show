# Survey Says — Game Mechanics Reference

> **Status: Design/documentation only — not yet implemented.**
> Refer to NTT `/host` and `/gameadmin` pages as implementation starting points.

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

## 5. Lightning Round (Future / TBD)

> ⚠️ Not fully designed. Revisit before Phase 5 implementation.

**Open questions:**
- How are two players from the winning team managed sequentially (Player 2 "isolated" so they don't hear duplicates)?
- Dual-timer setup: ~20s for Player 1, ~25s for Player 2
- Point target: combined 200 points to win ultimate prize
- All timers/targets should be configurable in `/gameadmin`

**Key concern:** Lightning Round may require free-text entry by the host for spoken responses — this may not be practical in a live show setting. **Needs further consideration before committing to implementation.**

---

## 6. Open Design Questions / Notes

- **Text entry concern:** Main Play may also require host to type/match spoken answers to board slots. Consider whether answer matching should be click-only (pre-loaded slots) or require free text input. Click-only (reveal slot 1, slot 2, etc.) is simpler and less error-prone live.
- **Multiplier display:** Show "DOUBLE POINTS" / "TRIPLE POINTS" text on `/show` rather than a numeric multiplier.
- **Strike display:** 3 circular X icons on `/show` — red = active strike, gray = unused.
- **Active team glow:** Active/guessing team's score panel should glow brighter on `/show` (lighting only, no text label).
- All game settings (timers, sweep bonus, threshold, multiplier schedule) should be configurable in `/gameadmin` before game start.
