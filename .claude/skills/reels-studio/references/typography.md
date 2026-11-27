# Typographer's playbook — captions, titles, fonts

## Caption presets (`captions.preset`)
| preset | look | for |
|---|---|---|
| `bold_pop` | Cairo Black, white + yellow active word, pop | default, Arabic/Darija |
| `hormozi` | Anton, 2 words, green active, uppercase | edutainment (Latin) |
| `mrbeast` | Anton huge, active colour cycles yellow/green/red/blue | max retention, comedy |
| `neon_glow` | cyan glow | tech |
| `karaoke_fill` | grey filled white as spoken | podcast, storytime |
| `boxed` | black text in white box, pink active | ads, clean brands |
| `news` | white on red box | news/explainer |
| `luxury` | Playfair italic, gold active | luxury, cinematic |
| `clean_minimal` | Montserrat small, no highlight | aesthetic, lo-fi |
Arabic words auto-switch to Cairo inside Latin-font presets; RTL handled by the engine.

## Rules
- 1–3 words per screen (energy) up to 5 (calm). Groups break at pauses/punctuation automatically.
- 1 `emph` word per sentence (number, result, emotion) → red + bigger.
- `y` 0.62–0.70 under the chin; move to 0.5 if the bottom has action. Never in y < 0.12 or > 0.78.
- Fix ASR spelling in words.json (Darija in Arabic script as spoken). Never invent words.

## Titles (`texts`)
`hook` (yellow box, ≤ 6 words, 0→2.5 s) · `label` (names/places/specs) · `number` (list steps, anim drop) ·
`big` (Bebas, one word punchline / brand name) · `luxury` (Playfair, premium) · `news` (red box) · `cta` (last 2–3 s).
Anim: pop, slide, drop, typewriter, fade; `rotate` -4..4 for a hand-made feel.
Cars: specs as `label` ("0-100: 4.2s", "V8", "2024"), brand name as `big`/`luxury`, CTA with phone/handle as `cta`.

## Progress bar
Thin bar at y=0 in the brand/accent colour for talking heads (retention cue); off for luxury/montage.
