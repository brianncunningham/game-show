# TToTO — Content JSON Guide (Bulk Upload)

This is the schema for the **Bulk JSON Import** box on `/gameadmin` (Content tab →
"Advanced: Bulk JSON Import", TToTO mode must be active). Pasting a valid array here and
clicking **Parse** → **Replace with N Rounds** replaces **all** currently loaded rounds —
it's an all-or-nothing swap, not a merge.

Ground truth for this schema is the client validator in
`src/modes/ttoto/TToTOAdminComponent.tsx` (`BulkJsonImport`'s `validate()`) and the types in
`src/modes/ttoto/types.ts`. If this doc and the code ever disagree, the code wins — but
please update this doc too.

## Top-level shape

A JSON **array of Round objects**. Order matters — rounds play in array order, 1 → N.

```json
[
  { "flavor": "trivia", "questions": [ ... ] },
  { "flavor": "category_sort", "categoryOptions": ["...", "...", "..."], "questions": [ ... ] }
]
```

## Round object

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | no | Auto-generated if omitted. Safe to leave out. |
| `roundNumber` | number | no | **Ignored on import** — rounds are renumbered 1..N by array position regardless of what you put here. |
| `flavor` | string enum | **yes** | One of the 7 values below. |
| `categoryOptions` | `[string, string, string]` | only for `category_sort` | Exactly 3 non-empty strings, fixed for the whole round. |
| `questions` | array of Question objects | **yes** | At least 1 required. |

Any other field you add (e.g. `letterStyle`, `difficulty`, `points`) is **silently dropped**
on import — it's not part of the current schema.

### Valid `flavor` values (player-facing name in parens)

- `trivia` — "Just the Facts"
- `odd_one_out` — "Odd One Out"
- `real_or_fake` — "Real or Fake"
- `closest_guess` — "On The Nose"
- `attribution` — "Whodunit?"
- `media_id` — "ID Please" (only flavor that uses `mediaType`/`mediaRef`/`mediaStartMs`)
- `category_sort` — "Triage" (only flavor that uses `categoryOptions`)

Besides `media_id` and `category_sort`, **all flavors share the exact same question
shape** — `flavor` is purely thematic/presentational for `trivia`, `odd_one_out`,
`real_or_fake`, `closest_guess`, and `attribution`. Pick whichever name best matches the
content you're writing.

## Question object

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | no | Auto-generated if omitted. |
| `prompt` | string | **yes** | The question text. For `category_sort`, this is the *item to classify* rather than a question (e.g. `"Tomato"`). |
| `choices` | `[string, string, string]` | **yes** | Exactly 3 non-empty strings. **Index 0 is always the correct answer** — the game randomly assigns the 3 choices to This/That/The Other display slots at runtime, so you never author display position. |
| `hostNote` | string | no | Shown only on `/host`, never on the audience `/show` screen. Good for trivia context, pronunciation, etc. |
| `mediaType` | `"song" \| "image" \| "sound"` | `media_id` only | Per-question, so one `media_id` round can mix types. |
| `mediaRef` | string | `media_id` only, if `mediaType` set | Spotify **track ID** for `"song"`; a filename under `public/ttoto/media/` for `"image"`/`"sound"`. |
| `mediaStartMs` | non-negative integer | `media_id` + `"song"` only | Playback start position in ms. Defaults to `0` (track start) if omitted. |

### `category_sort`-specific rule

Every question's `choices` must be an exact **permutation of the round's
`categoryOptions`** (same 3 strings, reordered so index 0 = the correct category for that
item). Example: if `categoryOptions` is `["Animal", "Mineral", "Vegetable"]`, then
`"Tomato"` → `choices: ["Vegetable", "Animal", "Mineral"]`.

## Validation errors you might see

| Error | Meaning |
|---|---|
| `Round N: invalid or missing flavor. Valid values: ...` | `flavor` is missing or not one of the 7 values above. |
| `Round N: needs at least one question.` | `questions` is missing, not an array, or empty. |
| `Round N: category_sort needs a "categoryOptions" array of exactly 3 strings.` | Missing/wrong-length/blank `categoryOptions` on a `category_sort` round. |
| `Round N, QM: prompt required.` | Blank/missing `prompt`. |
| `Round N, QM: choices must be an array of exactly 3 strings, first one correct.` | `choices` isn't length-3, or contains a blank/non-string entry. |
| `Round N, QM: choices must be a permutation of the round's categoryOptions (...).` | `category_sort` question's `choices` don't match the round's 3 categories exactly. |
| `Round N, QM: mediaType must be "song", "image", or "sound" if present.` | Bad `mediaType` value. |
| `Round N, QM: mediaStartMs must be a non-negative number if present.` | Bad `mediaStartMs` value. |

## Full sample (all 7 flavors)

This mirrors the "Load Example" button in the Bulk JSON Import UI
(`EXAMPLE_ROUNDS` in `TToTOAdminComponent.tsx`) — pasting this in Parse should succeed with
0 errors.

```json
[
  {
    "flavor": "trivia",
    "questions": [
      { "prompt": "Which planet is closest to the sun?", "choices": ["Mercury", "Venus", "Earth"] },
      {
        "prompt": "Which of these is NOT a mammal?", "choices": ["Bat", "Dolphin", "Penguin"],
        "hostNote": "Bats and dolphins are both mammals; penguins are birds."
      }
    ]
  },
  {
    "flavor": "odd_one_out",
    "questions": [
      {
        "prompt": "Which of these three is NOT a primary color (paint mixing)?", "choices": ["Green", "Red", "Blue"],
        "hostNote": "Green is a secondary color — it's a mix of blue and yellow."
      },
      { "prompt": "Which of these three does NOT have a shell?", "choices": ["Slug", "Snail", "Turtle"] }
    ]
  },
  {
    "flavor": "real_or_fake",
    "questions": [
      {
        "prompt": "Which of these three \"facts\" about octopuses is real?",
        "choices": ["Octopuses have three hearts", "Octopuses can fly short distances", "Octopuses are technically a type of fish"],
        "hostNote": "Octopuses have three hearts and blue, copper-based blood."
      }
    ]
  },
  {
    "flavor": "closest_guess",
    "questions": [
      { "prompt": "How many bones are in the adult human body?", "choices": ["206", "150", "300"] }
    ]
  },
  {
    "flavor": "attribution",
    "questions": [
      { "prompt": "Who directed the movie \"Jaws\"?", "choices": ["Steven Spielberg", "George Lucas", "Martin Scorsese"] }
    ]
  },
  {
    "flavor": "media_id",
    "questions": [
      {
        "prompt": "Identify this song", "choices": ["Bohemian Rhapsody", "We Will Rock You", "Another One Bites the Dust"],
        "mediaType": "song", "mediaRef": "3z8h0TU7dZUno2LRR6BSjA", "mediaStartMs": 30000
      },
      {
        "prompt": "Identify this landmark", "choices": ["Eiffel Tower", "Big Ben", "Leaning Tower of Pisa"],
        "mediaType": "image", "mediaRef": "eiffel-tower.jpg"
      },
      {
        "prompt": "Identify this sound", "choices": ["Dial-up modem connecting", "Fax machine", "Old dot-matrix printer"],
        "mediaType": "sound", "mediaRef": "dial-up-modem.mp3"
      }
    ]
  },
  {
    "flavor": "category_sort",
    "categoryOptions": ["Animal", "Mineral", "Vegetable"],
    "questions": [
      { "prompt": "Tomato", "choices": ["Vegetable", "Animal", "Mineral"] },
      { "prompt": "Granite", "choices": ["Mineral", "Animal", "Vegetable"] },
      { "prompt": "Elephant", "choices": ["Animal", "Mineral", "Vegetable"] },
      { "prompt": "Quartz", "choices": ["Mineral", "Vegetable", "Animal"] }
    ]
  }
]
```

## AI content-generation prompt

Paste this into an LLM (with your own topic/count requests appended) to generate content
that should paste straight into the Bulk JSON Import box.

```text
Generate trivia content for a game called "This, That, or the Other" as a single JSON
array of Round objects. Follow this schema exactly:

- Top level: a JSON array of Round objects. No other keys, no markdown fences, no comments
  — just the raw JSON array.
- Round object fields:
  - "flavor": one of "trivia", "odd_one_out", "real_or_fake", "closest_guess",
    "attribution", "media_id", "category_sort" (required)
  - "categoryOptions": array of exactly 3 short strings — ONLY include this field if
    flavor is "category_sort"; omit it for every other flavor
  - "questions": array of Question objects (required, at least 1)
- Question object fields:
  - "prompt": string (required). For "category_sort", this is a single item/word to
    classify (e.g. "Tomato"), not a full question.
  - "choices": array of EXACTLY 3 short strings (required). Index 0 MUST be the correct
    answer — do not shuffle it, the app randomizes display position itself. The other two
    entries are plausible wrong answers of similar length/specificity.
  - "hostNote": optional string — brief context/explanation shown only to the host, never
    to the audience. Use it to explain non-obvious answers.
  - For "category_sort" questions only: "choices" must be the round's 3 "categoryOptions"
    strings reordered so index 0 is the correct category for this item.
  - For "media_id" questions only (optional fields): "mediaType" is "song", "image", or
    "sound"; "mediaRef" is a Spotify track ID for "song" or a filename for "image"/"sound"
    (assume the file exists, just invent a sensible name); "mediaStartMs" (song only) is an
    optional non-negative integer playback start offset in ms.
  - Do not include "id" or "roundNumber" — they're assigned automatically on import.

Keep choices roughly parallel in length/style so the correct answer isn't obvious just from
formatting. Now generate: [DESCRIBE YOUR ROUNDS HERE — e.g. "6 rounds of 10 questions each:
2 trivia, 1 odd_one_out, 1 real_or_fake, 1 attribution, 1 media_id (image only); plus a 7th
category_sort round of 25 items sorting movies into Comedy/Drama/Horror"].
```
