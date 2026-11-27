# Style catalog (14 packs)

Apply with `reelkit.py autoplan --style KEY`. Each row says what each of the 4 people does.

| key | style | family | Cutter | Motion | Sound | Typographer |
|---|---|---|---|---|---|---|
| `hormozi_edu` | Hormozi / Edutainment | talking-head | beats 2.0s, speed 1.08, zoom [[1.0, 1.05], [1.16, 1.2]] | cut, punch, whip_left; fx: -; grade punchy | sfx 0.6 | captions `hormozi`, hook `hook` |
| `mrbeast_retention` | MrBeast / Max retention | talking-head | beats 1.5s, speed 1.12, zoom [[1.0, 1.08], [1.2, 1.26]] | cut, flash, glitch, punch, whip_up; fx: -; grade punchy | sfx 0.7 | captions `mrbeast`, hook `hook` |
| `podcast_clip` | Podcast clip | talking-head | beats 3.5s, speed 1.0, zoom [[1.0, 1.04], [1.12, 1.15]] | cut, punch; fx: -; grade clean_bright | sfx 0.3 | captions `karaoke_fill`, hook `hook` |
| `clean_aesthetic` | Clean aesthetic / lifestyle | any | beats 3.2s, speed 1.0, zoom [[1.0, 1.06], [1.06, 1.0]] | cut, zoom_blur; fx: -; grade warm_film | sfx 0.3 | captions `clean_minimal`, hook `hook` |
| `cinematic_vlog` | Cinematic vlog / story | any | beats 2.8s, speed 1.0, zoom [[1.0, 1.07], [1.08, 1.0]] | cut, whip_left, whip_right, zoom_blur; fx: letterbox; grade cinematic | sfx 0.45 | captions `luxury`, hook `luxury` |
| `tech_neon` | Tech / AI / tutorial | talking-head | beats 2.4s, speed 1.05, zoom [[1.0, 1.05], [1.14, 1.18]] | cut, glitch, punch, whip_up; fx: chroma; grade moody | sfx 0.55 | captions `neon_glow`, hook `hook` |
| `news_explainer` | News / explainer | talking-head | beats 2.6s, speed 1.05, zoom [[1.0, 1.04], [1.12, 1.15]] | cut, punch, whip_left; fx: -; grade clean_bright | sfx 0.45 | captions `news`, hook `news` |
| `storytime_karaoke` | Storytime | talking-head | beats 3.0s, speed 1.0, zoom [[1.0, 1.08], [1.1, 1.16]] | cut, zoom_blur; fx: -; grade moody | sfx 0.4 | captions `karaoke_fill`, hook `hook` |
| `lofi_authentic` | Lo-fi authentic | any | beats 4.0s, speed 1.0, zoom [[1.0, 1.0], [1.0, 1.0]] | cut; fx: -; grade none | sfx 0.0 | captions `clean_minimal`, hook `hook` |
| `retro_vhs` | Retro VHS / Y2K | any | beats 2.2s, speed 1.0, zoom [[1.0, 1.05], [1.12, 1.15]] | cut, flash, glitch; fx: vhs; grade warm_film | sfx 0.5 | captions `bold_pop`, hook `hook` |
| `meme_comedy` | Meme / comedy | talking-head | beats 2.0s, speed 1.1, zoom [[1.0, 1.0], [1.3, 1.35]] | cut, flash, punch; fx: -; grade punchy | sfx 0.75 | captions `mrbeast`, hook `hook` |
| `ugc_product_ad` | UGC product ad | talking-head | beats 2.3s, speed 1.08, zoom [[1.0, 1.05], [1.14, 1.18]] | cut, punch, whip_left; fx: -; grade clean_bright | sfx 0.5 | captions `boxed`, hook `hook` |
| `car_hype_montage` | Car hype montage (beat-sync) | montage | beats 1.0s, speed 1.0, ramps, zoom [[1.0, 1.1], [1.15, 1.05]] | cut, flash, glitch, whip_left, whip_right, whip_up, zoom_blur; fx: letterbox, beat_flash; grade moody | sfx 0.55 | captions `bold_pop`, hook `big` |
| `luxury_showcase` | Luxury showcase (cars / real estate) | montage | beats 2.6s, speed 1.0, zoom [[1.0, 1.08], [1.08, 1.0]] | cut, whip_left, zoom_blur; fx: letterbox; grade cinematic | sfx 0.35 | captions `luxury`, hook `luxury` |

## When to use

- **Hormozi / Edutainment** — Jump cuts with zero air, alternating zoom, 2 big words at a time, green active word, SFX on everything.
- **MrBeast / Max retention** — Very fast cuts, shake on impacts, flashes, huge colourful words, numbers flying in.
- **Podcast clip** — Calm cuts on sentences, punch-in on key line, karaoke captions, waveform-free clean look.
- **Clean aesthetic / lifestyle** — Slow pushes, soft warm film look with grain, small elegant captions, few transitions.
- **Cinematic vlog / story** — Letterbox bars, teal-orange, whip pans between places, serif titles, riser into the payoff.
- **Tech / AI / tutorial** — Neon glow captions, glitch on 'wrong vs right', numbered steps, cool contrasty grade.
- **News / explainer** — Boxed lower-thirds, red/white news captions, clean grade, labels for facts and numbers.
- **Storytime** — Long sentences on screen filled word by word, moody grade, subtle zooms, suspense SFX.
- **Lo-fi authentic** — Almost raw: hard cuts only, small captions, no grade. For trust, emotion, behind-the-scenes.
- **Retro VHS / Y2K** — Scanlines, chromatic shift, warm faded colours, glitch transitions, REC-style labels.
- **Meme / comedy** — Snap zooms with shake on the punchline, big impact text, emoji reactions, boom SFX.
- **UGC product ad** — Problem → product → result → offer. Clean bright grade, boxed captions, price/offer callouts, CTA.
- **Car hype montage (beat-sync)** — Cuts on the beat, speed ramps, whips with motion blur, flashes, dark moody grade, big Bebas titles. For cars, sport, fashion.
- **Luxury showcase (cars / real estate)** — Slow elegant pushes, letterbox, serif italic titles, warm cinematic grade, soft whooshes. Premium feel.

## Choosing
- Speech-driven footage → talking-head packs; footage without useful speech (cars, products, travel b-roll) → `car_hype_montage` or `luxury_showcase` with a music track.
- Unsure → render 2 packs as 6-second `--preview`s of the same moment and let the user choose.
