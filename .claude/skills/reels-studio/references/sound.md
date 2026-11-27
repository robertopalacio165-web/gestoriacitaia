# Sound Designer's playbook — SFX for motion, music, voice, loudness

## SFX on motion (synthesized, license-free)
| type | put it on | volume |
|---|---|---|
| whoosh | whips, zoom_blur, text sliding in (starts 0.2 s early) | 0.4–0.6 |
| pop | punch-ins, stickers, captions pops (sparingly) | 0.3–0.5 |
| impact | hook text, big/number text, reveals, zoom_punches | 0.4–0.7 |
| riser | 1.0–1.2 s before the payoff / drop | 0.3–0.5 |
| flash | flash transitions, camera-shutter moments | 0.4 |
| glitch | glitch transitions | 0.4 |
| tick | labels, list steps | 0.3 |
The engine adds most of these automatically from transitions/texts/stickers; add the rest with `audio.sfx_events`
(output time). Every visual movement should have a sound; nothing should be louder than the voice.

## Music
- Only files the user owns/provides. Talking head: `music_volume` 0.08–0.15, auto-ducked under the voice.
- Montage: `keep_source_audio:false`, `music_volume` ~0.9, run `beats` first so cuts land on the beat.
  Keep short engine/door/exhaust moments from the source as sfx_events only if the user wants real car sound
  (then keep_source_audio true and lower music to 0.5).
- No licensed track available → SFX-only bed, and tell the user which second to align a trending sound to in-app.

## Voice chain (`cleanup:true`)
HPF 85 Hz → LPF 15 kHz → denoise → -2 dB@250 Hz → +2.5 dB@3.2 kHz → +1.5 dB@9 kHz → comp 3.2:1 → limiter → loudnorm.

## Delivery
-14 LUFS integrated, true peak ≤ -1 dBTP (checked by `qa`). Listen-check is impossible here, so verify by numbers
and by placement: SFX times must line up with transition/text times in the plan.
