# TToTO — ID Please media assets

Drop image and sound-effect files for `media_id` ("ID Please") questions here, then
reference the filename in the question's `mediaRef` field (e.g.
`mediaRef: "eiffel-tower.jpg"` or `mediaRef: "dial-up-modem.mp3"`).

No upload UI — this mirrors how every other static asset in this app works (see
`public/ttoto/sounds/`). Songs don't need a file here at all; `mediaRef` for a song
question is a Spotify Track ID instead, played via the existing Spotify Connect
integration (see `src/features/spotify/useSpotify.ts`). Sound-effect files, unlike
songs, play through the `/show` screen's own browser tab (there's no external device to
hand a local file off to).

See `docs/ttoto-id-please-plan.md` for the full design.
