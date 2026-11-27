# plan.json reference

Times in `segments[].in/out` and `words.json` are **source** seconds. Times in `texts`, `stickers`,
`zoom_punches`, `audio.sfx_events` are **output** seconds (after cutting). Output time of segment *i*
= sum of previous `(out-in)/speed`.

```jsonc
{
  "source": "/abs/path/raw.mp4",
  "output": {"w": 1080, "h": 1920, "fps": 30, "crf": 18},
  "reframe": "auto",          // auto | track (follow face) | center | blurfill (horizontal source on blurred bg)
  "segments": [{
    "in": 3.20, "out": 6.10,  // source seconds
    "speed": 1.0,             // 0.5–2.0 (audio uses atempo); 1.1–1.25 tightens slow talkers
    "zoom_from": 1.0, "zoom_to": 1.06,   // slow push; alternate 1.0 / 1.14 between jump cuts
    "crop_x": 0.5, "crop_y": 0.5,        // optional fixed framing (0..1 of source); default = face track
    "transition_in": "cut",   // cut | punch | whip_left | whip_right | whip_up | whip_down | flash | zoom_blur | glitch
    "shake": 0                // 0..1 camera shake (impact moments only)
  }],
  "words": "WORK/words.json", // [{"w": "كلمة", "s": 1.2, "e": 1.5, "emph": true}]
  "captions": {
    "enabled": true,
    "preset": "bold_pop",     // bold_pop | hormozi | neon_glow | karaoke_fill | boxed | clean_minimal
    "max_words": 3, "y": 0.66, // y = vertical centre (0..1)
    "font": "Cairo", "size": 92, "highlight": "#FFE600", "emph_color": "#FF3B3B"
  },
  "texts": [                  // kinetic titles (ASS). presets: hook | label | cta | big | number
    {"text": "...", "preset": "hook", "start": 0, "end": 2.5, "x": 0.5, "y": 0.2,
     "anim": "pop", "rotate": -3}   // anim: pop | slide | drop | typewriter | fade
  ],
  "stickers": [               // colour emoji or PNG with pop + float animation
    {"emoji": "🔥", "start": 3.0, "end": 4.4, "x": 0.8, "y": 0.4, "size": 170},
    {"image": "/abs/logo.png", "start": 27, "end": 30, "x": 0.5, "y": 0.45, "size": 320}
  ],
  "zoom_punches": [{"t": 11.0, "amount": 1.15, "dur": 0.4}],  // emphasis punch-in (+ impact SFX)
  "progress_bar": {"enabled": true, "color": "#FFE600", "height": 9, "y": 0.0},
  "grade": {"preset": "punchy", "grain": 4, "vignette": true, "sharpen": true},
     // punchy | cinematic | clean_bright | warm_film | moody | bw_contrast | none
  "audio": {
    "loudness": -14, "cleanup": true,      // HPF, denoise, EQ, compressor, limiter
    "sfx": true, "sfx_volume": 0.5,        // auto SFX on transitions/stickers/texts/punches
    "sfx_events": [{"type": "riser", "t": 9.0, "volume": 0.4}],  // whoosh|pop|impact|flash|glitch|riser|tick
    "music": null, "music_volume": 0.12    // user-provided track, auto-ducked under voice
  }
}
```

Auto SFX map: whip/zoom_blur → whoosh (starts 0.2 s early), punch → pop, flash → flash, glitch → glitch,
sticker → pop, hook/big/number text → impact, other text → tick, zoom_punch → impact.
