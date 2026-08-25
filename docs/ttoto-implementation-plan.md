# TToTO — Implementation Plan

> **Status: proposed plan, not yet in development.**
> Derived from [`ttoto-concept.md`](ttoto-concept.md) (game rules) and
> [`designs/ttoto-visual-notes.md`](designs/ttoto-visual-notes.md) (Show-screen visual spec),
> mapped onto the existing mode architecture (Name That Tune, Survey Says).
>
> Where the source docs left something open, this plan **recommends** an answer — every
> recommendation is marked ⭐ and collected in §9 for one-pass sign-off. Nothing marked ⭐
> is final until confirmed.

---

## 1. Architecture Fit

TToTO becomes the third registered mode, following the exact NTT/SS pattern. **No new
infrastructure is required** — JSON file persistence, the mode registry, the judge/window
buzzer state machine, WebSocket manager, and the Pi LED pipeline all carry over unchanged.

| Layer | Existing pattern to follow | TToTO piece |
|---|---|---|
| Server mode | `server/src/modes/surveySays/` (`index.ts`, `store.ts`, `routes.ts`, `types.ts`, `saveService.ts`) | `server/src/modes/ttoto/` |
| Mode registration | `registerMode()` in `modeRegistry.ts` | register `ttotoMode` (`id: 'ttoto'`) |
| Client mode | `src/modes/surveySays/clientMode.ts` (`ShowComponent` / `HostComponent` / `AdminComponent`) | `src/modes/ttoto/clientMode.ts`, registered in `main.tsx` |
| Runtime state persistence | `game-state-survey-says.json` (atomic tmp+rename write) | `game-state-ttoto.json` |
| Saved games/content | `game-data/<modeId>/save-*.json` via `gameSaveService` pattern | `game-data/ttoto/` with a TToTO-typed save service |
| Buzzer | `judgeController` windows + `piJudge`/`piLed` relay helpers in SS routes | same helpers, windows `ttoto-buzz` / `ttoto-steal` / `ttoto-wand-test` |

Note: the shared `gameSaveService.ts` hard-codes `GameShowQuestion` (NTT's type). Rather
than refactor it, TToTO gets its own small `saveService.ts` exactly as Survey Says did —
zero risk to existing modes.

---

## 2. Data Model

### 2.1 Question (content) — from concept §9, concretized

```ts
type TToTOFlavor = 'trivia' | 'odd_one_out' | 'real_or_fake' | 'closest_guess'
                 | 'media_id' | 'attribution' | 'category_sort';
type TToTOChoiceKey = 'this' | 'that' | 'the_other';

interface TToTOQuestion {
  id: string;
  flavor: TToTOFlavor;
  prompt: string;
  choices: Record<TToTOChoiceKey, string>;
  correct: TToTOChoiceKey;
  mediaRef?: string;          // Spotify track ID or image URL (media_id flavor)
  difficulty: 'easy' | 'medium' | 'hard';
  points?: number;            // optional override; default from round position (§9-Q4)
}

interface TToTORound {
  roundNumber: number;
  flavor: TToTOFlavor;        // one flavor per round (Pattern A rotation)
  questions: TToTOQuestion[];
}
```

⭐ **Recommendation:** a save = an ordered list of `TToTORound`s (session structure baked
into content), not a flat question pool. This matches Pattern A directly and lets the admin
UI show/edit the session shape.

### 2.2 Config — `/gameadmin` settings

```ts
interface TToTOConfig {
  buzzerMode: 'hardware-player' | 'hardware-team' | 'manual';  // same tri-mode as SS
  stealMode: 'EXCLUSIVE' | 'TIMED_WINDOW';   // default EXCLUSIVE (concept §5)
  stealWindowSecs: number;                   // default 5, TIMED_WINDOW only
  revealTiming: 'together' | 'prompt_first'; // ⭐ see §9-Q2
  falseStartPenalty: 'ignore' | 'lockout';   // ⭐ see §9-Q3
  doubleMissRule: 'no_score' | 'half_points';// ⭐ see §9-Q1b
  pointsSchedule: number[];                  // per-round base points, ⭐ see §9-Q4
  winningThreshold?: number;                 // optional "first to N" alternative
}
```

### 2.3 Round/runtime state (the state machine)

```ts
type TToTOPhase =
  | 'idle'            // nothing loaded
  | 'round_intro'     // round-type card on /show ("ROUND 2 — ODD ONE OUT")
  | 'reading'         // prompt (± choices, per revealTiming) visible, window OPEN+WAITING
  | 'armed'           // buzzers armed (window ARMED)
  | 'answering'       // buzz locked; team on the clock (panel state "SIGNAL LOCKED")
  | 'steal'           // first team missed; opposing team answering (or steal window running)
  | 'resolved'        // correct given or all misses; scores applied; reveal shown
  | 'game_over';

interface TToTORoundState {
  phase: TToTOPhase;
  currentRoundIndex: number;
  currentQuestionIndex: number;
  answeringTeamId: string | null;     // team on the clock
  buzzPlayerControllerId: string | null;  // who buzzed (host display)
  eliminatedChoices: TToTOChoiceKey[];    // wrong taps so far this question
  missedBy: { choice: TToTOChoiceKey; teamId: string }[];  // for crack overlays
  stealDeadline: number | null;       // epoch ms, TIMED_WINDOW only
  resolvedCorrectly: boolean | null;
}
```

Top-level `TToTOState` mirrors SS: `config`, `teams` (2 teams, reuse `SurveyTeam` shape),
`rounds`, `roundState`, `playerPool`, `controllerAssignments`, `randomizerSeq`,
`wandTestSeq`, `showIntro` — so the SS roster modal, team randomizer, and wand-test screens
port with minimal changes.

### 2.4 Store mechanics

Copy the SS store skeleton verbatim: singleton class, `begin()`/`commit()` with a
50-deep undo history, atomic persist to `game-state-ttoto.json`, hydration of
later-added fields on load. Host **Undo** comes for free and matters even more here —
a mis-tap on the 3-choice screen is the most likely host error in this mode.

---

## 3. Server: Routes & Buzzer Integration

REST mutations + host polling of `GET /state` (~800 ms), same as SS. All routes mounted
under `/api/game-show/ttoto/*`.

### 3.1 Core round-flow routes

| Route | Action | Judge/LED side-effect |
|---|---|---|
| `POST /load-question` | advance to next question, phase `reading` | `openWindow('ttoto-buzz', eligibleControllers: all assigned wands, earlyBuzzPenalty per config)` |
| `POST /arm` | phase `armed` (host taps when done reading, or auto when choices reveal) | `armWindow('ttoto-buzz')`; LED "armed" cue |
| *(buzz)* | `BUZZ_ACCEPTED` listener maps controller→team, sets `answeringTeamId`, phase `answering`, closes window | winner-team flash |
| `POST /judge {choice}` | host taps a choice. Correct → score + `resolved`. Wrong → eliminate choice, phase `steal`, steal logic below | miss: crack cue + `notifyTeamFailed(teamControllerIds)`; correct: celebration |
| `POST /resolve-steal {choice}` | steal team's answer judged the same way | same cues |
| `POST /next` | advance question/round, or `game_over` | `reset()` judge |
| `POST /undo`, `POST /adjust-score`, `POST /new-game` | same as SS | — |

### 3.2 Steal shapes

- **`EXCLUSIVE` (build first):** no re-arm at all. `phase: 'steal'` simply flips
  `answeringTeamId` to the other team; host taps their answer via `/resolve-steal`. This is
  pure store logic — no judge interaction — which is exactly why concept §5 calls it the
  sane first implementation.
- **`TIMED_WINDOW` (layer on later):** on miss, `openWindow('ttoto-steal',
  eligibleControllers: stealingTeamWands)` + `armWindow`, set `stealDeadline`. A server
  timer at expiry re-opens with all wands eligible (per the §9-Q1 decision). Requires no
  judge changes — eligibility filtering and re-opening windows are existing capabilities.

### 3.3 Content/save routes

`GET /saves`, `POST /saves`, `GET /saves/:id`, `PUT /saves/:id`, `DELETE /saves/:id`,
`POST /saves/:id/load-into-game` — clone of the SS save service, typed to
`TToTORound[]` + `TToTOConfig`.

---

## 4. Frontend

### 4.1 `/show` — TToTOShowComponent (mostly specced already)

Port `designs/reference-combo-screen.html` per visual-notes §8: lift the markup/CSS,
delete the demo IIFE, wire `TToTOFlipBoard.buildRow/cascadeRow/resetRow` to state
transitions, drive panel states (standby/active/missed/correct) and crack
variant+rotation from `missedBy`. Add the two screens the reference doesn't cover:
- **Round-intro card** (`round_intro` phase): round-type name dominant, per visual-notes §2.
- **Win state** (visual-notes §7 gap): ⭐ recommend gold `#ffb020`→white flash of the
  correct panel + letter tiles re-cascading in gold, no new art needed; can polish later.

Reuse: intro screen w/ `ttoto-logo-lockup-tagline.png`, SS team randomizer, SS wand-test
screen, SS victory screen pattern.

### 4.2 `/host` — TToTOHostComponent (needs design; proposal below)

Requirements from concept §4 mapped to one screen, following the SS host layout idiom
(scoreboard header, primary action area, footer utility row):

```
┌────────────────────────────────────────────────────────┐
│  Team 1  120        ROUND 2 · ODD ONE OUT        Team 2  180  │  ← scores + round
│              ▶ ANSWERING: TEAM 2 (Sarah, wand 7)              │  ← who's on the clock
├────────────────────────────────────────────────────────┤
│  PROMPT (full text, large)                                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │
│  │ THIS         │ │ THAT      ✓  │ │ THE OTHER    │          │  ← 3 tap targets,
│  │ dolphin      │ │ bat          │ │ penguin      │          │    correct one flagged
│  └──────────────┘ └──────────────┘ └──────────────┘          │    (border + ✓ icon)
├────────────────────────────────────────────────────────┤
│ [LOAD NEXT] [ARM BUZZERS] [RESET WINDOW] [UNDO] [+/-score]   │
│ (media_id only: [▶ PLAY CLIP] [REVEAL IMAGE])                │
└────────────────────────────────────────────────────────┘
```

- Choice buttons are the *only* judging control — tapping the flagged one scores, tapping
  another triggers the miss/steal transition. Already-eliminated choices render disabled
  with a crack icon. No text entry anywhere.
- The ✓ flag stays visible at all times (concept §4), including through the steal handoff.
- Buzzer window state chip (WAITING/ARMED/LOCKED) via `/ws/buzzer`, same as SS host.

### 4.3 `/gameadmin` — TToTOAdminComponent (needs design; proposal below)

Three tabs, mirroring the NTT admin structure:
1. **Content** — session editor: ordered round list (drag to reorder), each round has a
   flavor + question list; per-question form (prompt, 3 choices, correct radio, difficulty,
   optional mediaRef with a Spotify search picker reused from NTT for `media_id`).
   ⭐ Plus a **bulk JSON import** (paste an array matching §2.1 — the AI-generation path
   from concept §8) with schema validation and a difficulty-mix warning per round.
2. **Game setup** — config form (§2.2 settings), team names, player pool / roster /
   randomizer (ported from SS), controller assignments.
3. **Saves** — save/load/delete, clone of SS SaveManager.

### 4.4 Sounds

Not covered in either source doc. ⭐ Recommend, following the SS pattern
(`public/ttoto/sounds/*.mp3`, preloaded cache): arm sting, buzz-in, correct sting, miss
crack/shatter, steal-handoff riser, tick loop for TIMED_WINDOW countdown, round-intro
sting, win fanfare. The split-flap "clack" (visual-notes §4) belongs to the Show screen's
flip cascade, throttled to one sample per cascade, not per tile.

---

## 5. LED Cue Map (wands) — not covered in source docs

All achievable with existing pico effects (`flash`, `marquee`, `sparkle`, `rainbow`,
`spin`, `off`) via the existing `piLed` helper — **no firmware changes**. ⭐ Proposed map:

| Moment | Effect |
|---|---|
| Round intro | `marquee` in the round's team-neutral amber `[255, 176, 32]` |
| Window armed | `off` (dark wands = "go", matches SS convention) |
| Buzz accepted | winner-team color `flash` ×3 (team 1 crimson `[224, 98, 95]`, team 2 cyan `[62, 194, 217]` — same trio as the screen palette) |
| Miss | red `flash` ×4 on the missing team's wands (`notifyTeamFailed`) |
| Steal handoff | stealing team's color `sparkle` while they confer |
| TIMED_WINDOW open steal | `marquee` both team colors (everyone can buzz) |
| Correct answer | winning team color `sparkle` ~3 s |
| Round/game win | `rainbow` then `spin` in winner colors (SS victory pattern) |

Also: `ttoto-wand-test` window reusing the SS wand-test flow unchanged.

---

## 6. Phased Build Order

Each phase lands as its own PR and is independently testable.

1. **Phase 1 — Playable core (EXCLUSIVE steal, manual buzzer mode):** server mode
   (types/store/routes/saves/registration), minimal admin (JSON import + config + saves),
   functional host screen, functional show screen using the ported reference visuals
   (flip board + panels + cracks). Playable end-to-end with simulated buzzes.
2. **Phase 2 — Hardware + polish:** wand integration (windows, controller assignment,
   LED cue map §5), sounds §4.4, roster/randomizer/wand-test ports, win-state visual,
   round-intro card, victory screen.
3. **Phase 3 — Full-fat:** `TIMED_WINDOW` steal (server timer + second arming pass +
   countdown UI), `media_id` flavor (Spotify playback via existing NTT hook + image
   reveal), full per-flavor admin forms, false-start penalty enforcement.

Rough sizing: Phase 1 is one focused session; Phases 2–3 one more combined, hardware
testing aside.

---

## 7. Testing Notes

- Store state-machine unit tests are cheap and high-value here (steal transitions,
  elimination bookkeeping, double-miss, undo) — the SS store's phase logic is the model.
- End-to-end via the existing local-dev flow (`.agents/skills/testing-local-dev`),
  simulated buzzes through the buzzer diagnostics page.
- Hardware/LED cues need a live-wand pass — flag for a session where the Pi rig is up.

---

## 8. Explicitly Out of Scope (for the first build)

- Pattern B mixed-mechanic variety show (concept §6) — platform-level, separate effort.
- Supabase/remote content submission — JSON stays; revisit when crowdsourced
  guest-submission rounds are wanted.
- >3 answer choices (concept §10-Q6) — schema uses a keyed `choices` object, so a fourth
  key would be additive if ever needed; no host-layout provision made now.
- Segmented-display real 14-segment font sourcing (visual-notes §4c) — keep ghost-layer fake.

---

## 9. Open Questions → Recommendations (⭐ = proposed, needs sign-off)

From concept §10 and visual-notes §7, each with a concrete suggestion:

| # | Question | ⭐ Recommendation | Why |
|---|---|---|---|
| Q1a | Open-steal eligibility after TIMED_WINDOW expires | Everyone may buzz, **including** the team that missed | Simplest rule to explain live; keeps whole room engaged; the missing team already burned a choice so they're not advantaged |
| Q1b | Double-miss on a fully-eliminated question | **No score**, quick reveal, move on | Consolation math slows the show for the least interesting outcome; keep pace |
| Q2 | Reveal timing | **`prompt_first`** as default: prompt alone while host reads, then choices cascade in (the flip-board reveal IS the moment) — buzzers arm when choices land | Makes the signature animation load-bearing; creates a natural arm point; config-switchable per §2.2 |
| Q3 | False-start penalty | **`ignore`** (buzz before choices land = nothing happens) | Judge already rejects NOT_ARMED buzzes for free; lockouts punish enthusiasm at a party |
| Q4 | Point curve | Flat-per-round escalating schedule `[100, 100, 200, 200, 300]`, steal worth **full value** | Same 100s scale as NTT (visual-notes lean); full-value steals keep trailing teams alive; schedule is config so it's tunable per session |
| Q5 | Final/bonus round shape | Last round = `media_id` at 2× with TIMED_WINDOW steal forced on | Media is the finale-weight flavor per visual-notes §7; forced open steal maximizes end-game drama |
| Q6 | Round sequence default | Ship the floated 5-round rotation (Straight Trivia → Category Sort → Real or Fake → Odd One Out → Media ID) as the sample/default save | Already the discussed shape; it's content, not code — trivially changeable |
| Q7 | Flavor → letter-style pairing | Split-flap for word-answer flavors (trivia, odd-one-out, attribution, real-or-fake, category sort); dot-matrix for `closest_guess` numerics; segmented for `media_id` years/short codes | Plays each style to its strength: tactile flaps for words, scoreboard digits for numbers, gate-sign for terse codes |
| Q8 | Crack variant selection | Random variant weighted by difficulty (easy→Hairline-leaning, hard→Spider-web/Corner-leaning) + random rotation per visual-notes §5 | Uses the difficulty tier already in the schema; keeps variety without a new mechanic |
| Q9 | Win-state panel visual | Gold flash + gold tile re-cascade (§4.1), designed properly in Phase 2 | Unblocks Phase 1 with a placeholder that already reads as "win" |
| Q10 | Asset-vs-code chrome split | Ship Phase 1 fully code-drawn (reference file as-is); revisit designed PNG chrome only if it looks flat on the real display | Avoids blocking the build on art; the reference screen already looks good |

---

## 10. Decision Log

*(fill in as the ⭐ items above are confirmed or overridden)*

| Date | Item | Decision |
|---|---|---|
| — | — | — |
