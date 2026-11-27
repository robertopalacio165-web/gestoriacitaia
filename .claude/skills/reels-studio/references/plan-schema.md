# plan.json (overlay styles)
Times in `segments[].in/out` and words.json are SOURCE seconds; everything else is OUTPUT seconds (from 0).
```jsonc
{
 "style": "full_screen | split_screen | cinematic",
 "source": "/abs/video.mp4", "output": {"w":1080,"h":1920,"fps":30,"crf":18},
 "reframe": "center",
 "segments": [{"in": 0, "out": 30, "speed": 1.0, "zoom_from": 1.0, "zoom_to": 1.0, "transition_in": "cut"}],
 "words": "/abs/words.json",            // [{"w":"كلمة","s":1.2,"e":1.5,"spk":0,"emph":true}]
 "captions": {"enabled": true, "preset": "word_mouth | mono_box | cine_build", "y": 0.62, "max_words": 1},
 "checklists": [{"items": ["...", "..."], "checks": [3.2, 5.0], "start": 2.8, "end": 7.0, "y": 0.83, "x": 0.5}],
 "split": {"focus_y": 0.4, "cards": [
    {"type": "headline", "title": "...", "tags": ["..."], "start": 0, "end": 1.4},
    {"type": "yellow",   "title": "...", "tags": ["..."], "start": 1.4, "end": 3},
    {"type": "stat", "title": "...", "value": "-4000€", "bars": [0.3,0.5,0.4,0.7,0.95], "label": "...", "start": 3, "end": 5},
    {"type": "photo", "at": 27.5, "label": "...", "tilt": -2, "start": 5, "end": 7},
    {"type": "quote", "title": "...", "start": 7, "end": 9}]},
 "look": "cinematic",
 "behind_texts": [{"text": "BLACK FRIDAY", "start": 18.0, "end": 19.8, "y": 0.27, "color": "#D61620", "stretch": 1.65}],
 "grade": {"preset": "none", "grain": 9, "vignette": true, "sharpen": false},
 "audio": {"keep_source_audio": true, "cleanup": false, "music": null, "sfx": true, "sfx_volume": 0.25, "loudness": -14}
}
```
