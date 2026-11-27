# Color, sound & delivery (Finisher's playbook)

## Grade presets (`grade.preset`)
| preset | look | when |
|---|---|---|
| `punchy` | +contrast, +saturation, teal shadows / warm highlights | default social look |
| `cinematic` | teal-orange, medium contrast curve | vlogs, travel, story |
| `clean_bright` | lifted, airy, gentle warmth | beauty, food, lifestyle, indoor dim footage |
| `warm_film` | warm temperature, lifted blacks, film curve (+grain 5–7) | aesthetic, nostalgic |
| `moody` | desaturated, dark, cool | serious, emotional, night |
| `bw_contrast` | black & white | dramatic quote moments |
| `none` | untouched | already graded / lo-fi |
Extras: `sharpen` (default on), `vignette` (on), `grain` 0–8 (3–5 typical). Check skin tones on the
preview frames: if skin turns orange/red, switch `punchy` → `clean_bright`.

## Voice chain (`audio.cleanup: true`)
HPF 85 Hz → LPF 15 kHz → FFT denoise → −2 dB @250 Hz (mud) → +2.5 dB @3.2 kHz (presence) → +1.5 dB @9 kHz (air)
→ compressor 3.2:1 → limiter → loudnorm −14 LUFS / −1.5 dBTP. Turn cleanup off only for music-only clips.

## Sound design
- Auto SFX are synthesized (no licensing issues): whoosh, pop, impact, flash, glitch, riser, tick.
- `sfx_volume` 0.35–0.6. Add a `riser` 1.0–1.2 s before the payoff, an `impact` on the reveal.
- Music: only a file the user provides (or royalty-free they own). `music_volume` 0.08–0.15; it is
  sidechain-ducked under the voice automatically. Trending sounds must be added in-app by the user
  (licensing) — tell them which moment to align it to.

## Delivery & QA (must pass before sending)
- `reelkit.py qa`: 1080x1920, 30 fps, −14 ±1 LUFS, true peak ≤ −1.
- Read the QA contact sheet: captions readable, nothing in UI zones, no black frames, face never cut off.
- Duration = target ±0.5 s. File name: `<name>_reel_30s.mp4`.
