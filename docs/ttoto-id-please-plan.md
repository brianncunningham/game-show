# TToTO — "ID Please" (media_id flavor) — Design Notes

> **Status: implemented 2026-09-02** (song + image at first pass, sound effect added same
> day). This supersedes the `media_id` row in `ttoto-concept.md` §3 and the "Phase 3"
> `media_id` notes in `ttoto-implementation-plan.md` (§6, §9-Q5/Q7) — those two docs
> otherwise still describe TToTO as "concept approved, not yet in development," which is
> stale: the mode is actually built and in active use/refinement (store, routes,
> host/show/admin components all exist; `category_sort` "Triage" is the most recent
> flavor added before this one, same shape this one follows).
>
> Display name `ID Please` for the `media_id` flavor — `FLAVOR_LABELS.media_id` in
> `src/modes/ttoto/types.ts`.

---

## 1. Mechanic — where media fits in the existing flow

TToTO's flow today is `round_intro → reading (prompt) → armed (choices reveal, buzzers
arm) → answering → steal → resolved`. ID Please inserts one new phase between `reading`
and `armed`:

```
round_intro → reading (prompt) → media_shown (NEW) → armed (choices + buzz) → answering → steal → resolved
```

- **Two separate host actions**, decided explicitly: "Reveal Media" (new), then "Reveal
  Answers" (existing `revealChoices()` — no change needed there, `media_shown → armed` is
  just another caller of the same transition, same as `categories_shown → armed` does for
  Triage).
- **No mid-media buzzing.** Buzzers only go live at the normal `armed` phase, same as every
  other flavor. Media is purely a reveal beat — this means **zero changes to the
  buzzer/steal state machine**, only a new phase + a rendering surface for the media.
- Host screen shows a type-cue badge (e.g. `🎵 LISTEN UP` / `🖼 WATCH THE SCREEN`) as soon
  as the question loads (at `reading`, before the host even taps "Reveal Media"), so the
  host can verbally cue the room a beat ahead of revealing.

## 2. Media types

Decided per-question, not per-round — a single "ID Please" round can mix songs, images,
and sound effects question to question (unlike other flavors which are one-flavor-per-
round; media *type* is a question-level field here, not a round-level one).

| Type | Sourcing | Playback/render |
|---|---|---|
| **Song** | Reuses NTT's existing Spotify Connect integration (`src/features/spotify/useSpotify.ts`) as-is. Admin field is a plain "Spotify Track ID" text box — checked NTT's `ContentManager.tsx`, it's just a pasted ID, not a live search picker (the old implementation-plan doc's "Spotify search picker" idea was never actually built for NTT, so none was built here either). | Host's Spotify account/device plays audio through the synced speaker — the browser tab never plays it. `TToTOHostComponent` calls `spotify.play(mediaRef, 0)` directly (same pattern as `NTTHostComponent`) whenever the current question is a song, on both Reveal and Replay. Show screen renders a "🎵 NOW PLAYING" badge, no actual audio. |
| **Image** | No upload UI — matches how every other static asset in this app works (sounds, logos): drop the file into `public/ttoto/media/`, reference by filename in the question's `mediaRef`. No server upload infra exists anywhere in this repo, and none was added for this. | Full-bleed render on `/show` only, from `media_shown` through `resolved`. |
| **Sound effect** | Added same day as song/image, for "identify this sound" questions — doesn't fit on Spotify. Same `public/ttoto/media/` file-drop convention as images (any browser-playable audio format, e.g. mp3). | Unlike song, there's no external device to hand a local file off to — it plays through the **`/show` screen's own browser tab** (`playMediaFile()` in `sounds.ts`, a plain `new Audio(...)`. This relies on the same "autoplay from a polled state transition, no user gesture" behavior TToTO's other cue sounds already depend on — proven to work since `playCorrectSound`/`playMissSound`/etc. already do exactly this.). Show screen renders a "🔊 NOW PLAYING" badge. |
| **Video** | ❌ deferred | Two options considered, both with real downsides for a Pi-hosted local rig at a physical party: self-hosted mp4 (offline-safe, but storage + manual clipping work) vs. YouTube embed (zero storage, but depends on live venue internet, ads/related-video breaking the fullscreen show screen, and region/embed-lock risk you can't fix mid-party). Revisit once source clips are picked and the venue's internet situation is known. |

## 3. Schema

`TToTOQuestion` (both `src/modes/ttoto/types.ts` and `server/src/modes/ttoto/types.ts`):

```ts
mediaType?: 'song' | 'image' | 'sound';   // which kind of media mediaRef points to
mediaRef?: string;   // Spotify track ID (song), or filename under public/ttoto/media/ (image/sound)
```

## 4. Builder UI

Follows the same pattern `category_sort` ("Triage") already established in
`TToTOAdminComponent.tsx`: a flavor-specific field group bolted onto the generic
`QuestionForm` (see `CategorySortRow` for the row-swap precedent; `media_id` reuses
`QuestionForm`'s normal prompt/3-choices layout and just adds a `MediaFields` block above
it). `MediaFields` has:
- `mediaType` dropdown (Song / Image / Sound effect) — plain MUI `Select`.
- `mediaRef` text field — label/placeholder switches with `mediaType` ("Spotify Track ID"
  / "Image filename" / "Sound filename").

Bulk JSON import (`BulkJsonImport` in the same file) passes through `mediaType`/`mediaRef`
alongside the existing `hostNote` passthrough, with validation that `mediaType` (if
present) is one of the three values.

## 5. Store/route/component changes (implemented)

- `TToTOPhase` member `media_shown` (client + server `types.ts`), inserted between
  `reading` and `armed` — same shape as `categories_shown` was added for Triage.
- Store: `revealMedia()` (`reading → media_shown`) and `replayMedia()` (bumps
  `mediaReplaySeq`, doesn't touch `phase` — see §6). `revealChoices()` unchanged; it's
  already the generic "advance to armed" transition (Triage proved this doesn't need a
  flavor branch), so `media_shown → armed` is just another caller of it.
- Routes: `POST /reveal-media`, `POST /replay-media` — no hardware/LED side-effects,
  buzzers aren't armed until the follow-up `/reveal-choices`.
- Host component (`TToTOHostComponent.tsx`): a type-cue `Chip` on the `reading` card
  (🎵/🔊/🖼), a "Reveal Media →" button branch replacing "Reveal Choices →" for `media_id`
  questions, a new `media_shown` phase card (image thumbnail, or the raw track/filename
  ref for song/sound), and a persistent "🔁 Replay" button in the status bar (visible
  `media_shown` through `resolved`). Wires in NTT's `useSpotify()` hook directly — same
  localStorage token, so a host who already connected Spotify for NTT this session doesn't
  need to reconnect — plus a small "Connect Spotify" link if not yet connected.
- Show component (`TToTOShowComponent.tsx`): renders the image full-bleed, or a "🎵/🔊 NOW
  PLAYING" badge for song/sound, inside the question panel from `media_shown` onward
  (`mediaRevealed` derived flag). Plays the actual clip via `playMediaFile()` for sound
  questions on both the initial reveal and every replay; song/image instead get a shared
  `playMediaRevealSound()` chime (`media-reveal.mp3` — needs the actual audio file dropped
  into `public/ttoto/sounds/`, same as `triage-alert.mp3`).

## 6. Host replay/retrigger control

Added 2026-09-02. Host can retrigger the media at any point, not just right after the
initial reveal:

- **Available window:** from `media_shown` all the way through `resolved` (i.e. any time
  the current question's media is the thing on screen), not just the first reveal beat.
  Two motivating cases: teams asking for another listen/look before committing an answer,
  and the show screen's full-bleed event overlays (`GameOverlays.tsx`, buzz/steal/resolved
  — see its `position: absolute; inset: 0` layer) stepping on a revealed image for a beat.
  Disappears once the host taps **Next** and a new question loads.
- **All three media types get the control**, for UI consistency, even though the
  underlying action differs:
  - **Song:** a real action — replay calls Spotify play again (same track, same start
    position used for the original reveal).
  - **Sound effect:** also a real action — replay re-plays the local audio file directly
    (`playMediaFile()`).
  - **Image:** the image never actually stops being shown, so "replay" has no state to
    restart. It re-plays the reveal cue (chime + a brief attention-pulse animation on the
    image, a quick scale/glow flash) rather than being a true no-op — keeps the button
    meaningful ("look again, everyone") without needing new state.
- Store-side: `replayMedia()`, valid whenever `roundState.phase` is `media_shown` or later
  for a `media_id` question and `currentQuestionIndex` hasn't advanced — doesn't change
  `phase`, just bumps `mediaReplaySeq` so the show screen can key a remount off of it and
  re-fire the reveal side-effect (Spotify play call for songs happens host-side, separate
  from this seq).

## 7. Open smaller items (not blocking)

- **`public/ttoto/sounds/media-reveal.mp3` needs to be dropped in** (referenced by
  `playMediaRevealSound()`, currently a harmless no-op since the file doesn't exist yet —
  same situation `triage-alert.mp3` was in when Triage first landed).
- Letter-style pairing (`ttoto-implementation-plan.md` §9-Q7 suggested "segmented" display
  for `media_id` years/short codes) may need reconsideration now that media type varies
  per-question within a round rather than the whole round being one flavor-consistent
  shape.
