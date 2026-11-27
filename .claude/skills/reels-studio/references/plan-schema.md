# plan.json reference
Source seconds: `segments[].in/out`, `words.json`. Output seconds: `texts`, `stickers`, `zoom_punches`,
`audio.sfx_events`, `fx.beats_out`. Output start of segment i = Σ previous (out-in)/speed.

```jsonc
{
 "style": "car_hype_montage", "source": "/abs/raw.mp4",
 "output": {"w":1080,"h":1920,"fps":30,"crf":18},
 "reframe": "auto",                    // auto | track (face) | center | blurfill
 "segments": [{"in":3.2,"out":6.1,"speed":1.0,"zoom_from":1.0,"zoom_to":1.06,"crop_x":0.5,"crop_y":0.5,
               "transition_in":"cut",  // cut|punch|whip_left|whip_right|whip_up|whip_down|flash|zoom_blur|glitch
               "shake":0}],            // 0..1
 "words": "WORK/words.json",           // [{"w":"كلمة","s":1.2,"e":1.5,"emph":true}]
 "captions": {"enabled":true,"preset":"bold_pop","max_words":3,"y":0.66,"font":"Cairo","size":92,
              "highlight":"#FFE600","emph_color":"#FF3B3B"},
    // presets: bold_pop hormozi mrbeast neon_glow karaoke_fill boxed news luxury clean_minimal
 "texts": [{"text":"...","preset":"hook","start":0,"end":2.5,"x":0.5,"y":0.2,"anim":"pop","rotate":-3}],
    // presets: hook label cta big number luxury news ; anim: pop slide drop typewriter fade
 "stickers": [{"emoji":"🔥","start":3,"end":4.4,"x":0.8,"y":0.4,"size":170},{"image":"/abs/logo.png","start":27,"end":30,"x":0.5,"y":0.45,"size":320}],
 "zoom_punches": [{"t":11.0,"amount":1.15,"dur":0.4}],
 "fx": {"letterbox":0.1,"vhs":1.0,"chroma":0.25,"beat_flash":0.25,"beats_out":[0.5,1.0]},
 "progress_bar": {"enabled":true,"color":"#FFE600","height":9,"y":0.0},
 "grade": {"preset":"punchy","grain":4,"vignette":true,"sharpen":true},
    // punchy cinematic clean_bright warm_film moody bw_contrast none
 "audio": {"loudness":-14,"cleanup":true,"keep_source_audio":true,"sfx":true,"sfx_volume":0.5,
           "sfx_events":[{"type":"riser","t":9.0,"volume":0.4}],   // whoosh pop impact flash glitch riser tick
           "music":null,"music_volume":0.12}
}
```
Auto SFX: whip/zoom_blur → whoosh (0.2 s early), punch → pop, flash → flash, glitch → glitch,
sticker → pop, hook/big/number text → impact, other text → tick, zoom_punch → impact.
`keep_source_audio:false` + `music` = music-only montage (source sound dropped).
