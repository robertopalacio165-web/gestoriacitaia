# Captions, kinetic type & graphics (Motion Designer's playbook)

## Caption presets (engine `captions.preset`)
| preset | look | best for |
|---|---|---|
| `bold_pop` | Cairo Black, white + yellow active word, pop scale | default, Darija/Arabic talking heads |
| `hormozi` | Anton, 2 words, green active word, uppercase | Latin-script, business/edutainment |
| `neon_glow` | cyan glow outline | tech, night, gaming |
| `karaoke_fill` | grey text filled white as spoken | music, storytelling |
| `boxed` | black text in white box, pink active word | clean brands, light footage |
| `clean_minimal` | Montserrat, 5 words, no highlight | aesthetic/lifestyle |

Rules
- 1–3 words per screen for energy, up to 5 for calm styles. Break groups at pauses and punctuation.
- Mark 1 word per sentence as `"emph": true` in words.json (number, result, emotion word) → red + bigger.
- Vertical position `y` 0.62–0.70 for talking heads (below chin, above UI). Move up to 0.5 if the
  bottom of the frame has important action.
- Arabic: font `Cairo` (bundled with Latin, so mixed "2026", "AI" work). RTL is handled by the engine.
- Latin-script Darija (3arabizi) works with any preset; prefer `hormozi` / `bold_pop`.

## Kinetic text presets (`texts`)
- `hook` — yellow box, black Cairo Black 96 px, `pop` in. y 0.18–0.24. 0 → 2–3 s.
- `label` — translucent dark box, 60 px: names, places, "Step 1".
- `number` — huge Anton yellow digit for lists (anim `drop`).
- `big` — huge white word for punchlines (one word!).
- `cta` — pink box at the end (last 2–3 s), anim `slide`.
- Animations: `pop` (overshoot scale), `slide`, `drop`, `typewriter`, `fade`; `rotate` −4..4 for a hand-made feel.

## Stickers
- Colour emoji via `stickers[].emoji` (Noto Color Emoji) or PNG via `image` (logos, screenshots).
- Pop + float + slight wobble are automatic; 1.2–1.6 s each; ≤ 1 every 4–6 s; place at x 0.2 or 0.8 so they don't hide the face.

## Safe zones (1080x1920)
- Top 0–220 px: account/status UI. Bottom 1500–1920 px: caption, buttons, audio. Right 960–1080 px: like/comment column.
- The progress bar at y=0 is the only element allowed in the top band.

## Brand
- Use the user's brand colour for `highlight`, `progress_bar.color` and `cta` box when given.
