# This, That, or the Other (TToTO) — Concept Spec

> **Status: concept approved for future build, not yet in development.**
> Captured for later implementation planning. No code exists for this mode.

---

## 1. Elevator Pitch

A team-vs-team, three-choice multiple-choice round. The host reads a prompt and three
labeled answer options — **This**, **That**, and **The Other** — one team locks in an
answer, and if they're wrong, the question passes to the other team to steal.

It reuses the plunger-style team buzzers (or can be adapted to individual wands — see §5),
and every question is judged from a pre-built answer key, so it fits the buzzer-box's core
host constraint: the host never types an answer live, only glances and taps.

Working name is intentionally a nod to existing game-show history without duplicating any
single format — see §7.

---

## 2. Core Mechanic

1. Host reads the prompt and the three labeled choices aloud (also shown on the
   player-facing display).
2. One team commits to an answer: This, That, or The Other. (Which team goes first —
   prior turn order, a buzz-in, or a fixed rotation — **TBD**.)
3. Host taps the matching choice on their tablet.
4. If it matches the pre-flagged correct choice: team scores, round ends.
5. If not: the question passes to the opposing team, who picks from the two remaining
   choices.
6. If the second team also misses (only relevant when it's down to one remaining choice,
   which is now known-correct by elimination) — round ends, no score, or optionally an
   "everyone missed" consolation rule (**TBD**).

Because the host's tablet always shows all three choices with the correct one flagged,
judgment is a single glance + single tap regardless of which team is answering or which
choice they name.

---

## 3. Round-Type Flavors

TToTO is a mechanic, not a single content type — the same 3-choice-plus-steal shape can
carry very different question genres. A full TToTO session is planned as a rotation
through several of these (see §6), not one flavor repeated all night.

| Flavor | Prompt shape | Example |
|---|---|---|
| **Straight Trivia** | Standard trivia question, 3 answer choices | "Which of these three planets is closest to the sun: This (Venus), That (Mercury), or The Other (Earth)?" |
| **Odd One Out** | Three items, two share a property, one doesn't | "Which of these three animals is NOT a mammal: This (dolphin), That (bat), or The Other (penguin)?" |
| **Real or Fake** | Three plausible items, one or two are invented | "Which of these three band names is real: This (Steel Panther), That (Velvet Thunderclap), or The Other (Disco Werewolf)?" |
| **Closest Guess** | Three preset numeric answers, pick nearest the true value | "Which is closest to the height of the Eiffel Tower: This (330m), That (450m), or The Other (600m)?" |
| **Media ID** | Audio clip or image shown/played, three labeled possibilities | Play three seconds of a song; "Is this from This (1985), That (1995), or The Other (2005)?" |
| **Attribution** | A quote/line, three possible sources | "Who said this line: This (character A), That (character B), or The Other (character C)?" |
| **Category Sort** | Fixed three buckets reused across many rounds, item changes each time | "Is a tomato This (a fruit), That (a vegetable), or The Other (a fungus)?" |

---

## 4. Host UI Requirements

Carried over from the existing host-tablet constraints and specialized for TToTO:

- Host screen shows the prompt, all three labeled choices, and the correct choice visually
  flagged (e.g., colored border or icon) **at all times** — never hidden, never requiring
  recall.
- Three tap targets, one per choice, always visible — tapping the flagged-correct one
  scores the active team; tapping either other one triggers a miss/steal transition.
- A visible "which team is currently answering" indicator, since the same three choices
  get reused across the steal handoff.
- No open-text entry anywhere in the round flow.
- Media-ID flavor needs host-side playback controls (play/pause the clip or reveal the
  image) layered onto the same three-choice screen.

---

## 5. Player Modes

- **Team plunger mode (primary design target):** Two teams, one plunger buzzer each.
  Matches the "wrong answer steals to the other team" premise directly — this is the
  format §2 describes.
- **Individual wand mode (needs a design decision):** The core mechanic assumes exactly
  two sides. With up to 20 individual wands, TToTO needs one of:
  - (a) **Arbitrary team split** — divide players into two sides for the round/game,
    functionally identical to plunger mode.
  - (b) **Sudden-death free-for-all steal** — first buzz answers; a miss re-opens the same
    question to a fastest-buzz race among everyone else, continuing until it's answered
    correctly or choices run out.

  *Recommendation:* decide this before building the individual-wand path; not needed for a
  first plunger-only build.

---

## 6. Session Structure

Two patterns were discussed; **Pattern A is the current direction.**

- **Pattern A — Flavor rotation (recommended first build):** TToTO stands alone as a full,
  selectable game mode, the same way Name That Tune and Survey Says each are. A session is
  a fixed sequence of rounds, each pulling from a different flavor in §3 (e.g., open on
  Straight Trivia, then Odd One Out, then Real or Fake for a laugh, escalating point
  values, closing on a bigger-stakes final round). The mechanic (3 choices + steal) stays
  constant; content genre is what keeps a session from feeling repetitive.
- **Pattern B — Mixed-mechanic variety show (future/roadmap idea):** TToTO becomes one
  round type among several completely different answer-judgment mechanics (open-answer
  buzzer race, Survey Says-style board, TToTO, etc.) combined into one larger show. Bigger
  lift — effectively a new platform-level "variety" mode — not scoped further here.

---

## 7. Prior-Art Check (reference, not a blocker)

Researched before finalizing the name/mechanic — nothing found that duplicates the
combination:

- **Trivia Trap** (early-1980s syndicated): closest match — 4-choice MC with a
  team-steal-on-miss main round. TToTO differs by using 3 labeled choices instead of 4.
- **Split Second** (1972 ABC): used "this/that-style questions" internally as a descriptor
  for 3-option board questions, but with no steal mechanic on those specifically.
- **Tic-Tac-Dough**: several special categories (Challenge, Seesaw, Trivia Challenge) let
  an opponent steal a missed square; modern revival added 3-choice MC to its first two
  rounds. Different board-game shape.
- **You Don't Know Jack's "Dis or Dat"**: phonetically close working-title precedent, but
  a sorting-a-list-of-7-items mechanic, not a single 3-choice steal question.

No existing show appears to combine "three named choices" + "team steal on miss" + this
branding as one packaged format.

---

## 8. Content Sourcing Notes

- **Manual writing** — most control, best for personalized/inside-joke content, most labor.
- **Existing trivia datasets** (Open Trivia DB, Wikipedia list pages, etc.) — adapt into
  the 3-choice shape.
- **Crowdsourced/personal** — e.g., guests submit true facts about themselves pre-party
  for a "which fact is really about [name]" round.
- **AI-generated, structured JSON** (reusing the Supabase-shaped approach previously
  scoped for NTT trivia) — a much better fit here than it was for live-hosted NTT, since
  correctness is baked into pre-built data and reviewed before the party rather than judged
  live.

**Distractor ("herring") quality matters more than question quality.** Two failure modes
to avoid: decoys so obviously wrong the round degenerates into single-answer trivia, or
decoys so close to correct the host faces a live ambiguous call. Write/generate distractors
as intentional "near-misses" within the same category, tag each question with a difficulty
tier (easy = obviously-wrong decoys, hard = near-misses) to balance a round's mix, and give
AI-generated distractor sets a second review pass to confirm both wrong answers are
actually, unambiguously wrong.

---

## 9. Suggested Content Schema (draft)

```json
{
  "id": "string",
  "flavor": "trivia | odd_one_out | real_or_fake | closest_guess | media_id | attribution | category_sort",
  "prompt": "string",
  "choices": {
    "this": "string",
    "that": "string",
    "the_other": "string"
  },
  "correct": "this | that | the_other",
  "media_ref": "optional — Spotify ID, image URL, etc.",
  "difficulty": "easy | medium | hard",
  "points": "number"
}
```

---

## 10. Open Questions

1. Individual-wand adaptation (§5) — arbitrary team split vs. sudden-death free-for-all.
2. What happens when both teams miss on a fully-eliminated question — no score, or a
   consolation rule?
3. Point-value curve across a flavor-rotation session, and shape of a final/bonus round.
4. Whether any flavor ever needs more than 3 choices, and if so how that affects the
   host-tablet layout.
5. Which team answers first on each question (§2 step 2) — fixed rotation, alternating,
   or buzz-in race.
6. Visual design direction — next phase, tracked separately.
