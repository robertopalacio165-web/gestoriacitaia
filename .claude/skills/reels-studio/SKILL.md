---
name: reels-studio
description: Professional reel editing (Instagram Reels / TikTok / Shorts) in two reference styles — Full Screen Talking Head and Educational Split Screen — done by a 4-person team (Cutter, Motion Designer, Sound Designer, Typographer). Use whenever the user gives a video and asks for a reel, "مونطاج", "ايديتينغ ديال الريلز", motion, graphics, captions/caption styles, text styles, or wants to see the styles. The footage and its own audio/music are kept as shot; only motion graphics, typography and motion sound effects are added. Local ffmpeg/OpenCV/libass/onnx engine, outputs 1080x1920 MP4.
---

# Reels Studio — 2 reference styles, 4-person team

The user's rule: **do not cut or re-time their video and never add music** (their video already has music).
Add only motion graphics, caption/typography styles and motion sound effects, at a professional level.
The two styles were extracted from the user's reference video; their exact specs are in
`references/reference-styles.md` — read it before every job.

| Key | Style | What gets added |
|---|---|---|
| `full_screen` | Full Screen Talking Head | BIG dark-glass checklist cards ABOVE the heads (scale ≈1.75, y ≈0.17) that tick coral ✓ as points are said; calm (no flashes/zooms) |
| `split_screen` | Educational Split Screen | top-half graphic panels on paper/grid changing every 1–2 s (headline, stat + bar chart, yellow card + mono tags, photo card, quote); speaker bottom half |

**Caption rules (user, non-negotiable):** captions ALWAYS at the bottom (y ≈ 0.79 full screen, ≈ 0.82 split), never in
the middle; thick letters (preset `bottom_bold`: white, black outline + shadow, 2–3 words, spoken word yellow,
keyword red). Font = the user's choice from 4 options (`captions.font_option`): `lalezar` (default), `baloo`, `alexandria`,
`marhey` — all heavy Arabic display fonts, drawn with Pillow/raqm (libass mis-shapes them). Before a new client's first video, show the 4-font board and let them pick. Graphics must be big and placed
where the audience sees them clearly (above the heads), never small at the bottom.

## The team (agents in `.claude/agents/`)
| # | Person | Owns in `WORK/plan.json` |
|---|---|---|
| 1 | **Cutter** `reels-cutter` | picks the 30 s window (`segments[0].in/out`), framing (`reframe`, `split.focus_y`) — no cuts unless the user asks |
| 2 | **Motion Designer** `reels-motion-designer` | `checklists`, `split.cards`, `grade` |
| 3 | **Sound Designer** `reels-sound-designer` | `audio` — motion SFX only (clicks, soft whooshes, impacts), never music; source audio untouched |
| 4 | **Typographer** `reels-typographer` | `captions` (preset, y, words.json spelling + `emph`) and every text inside graphics |

## Engine — `python3 .claude/skills/reels-studio/scripts/reelkit.py`
Needs ffmpeg (libass), numpy, Pillow (raqm), `opencv-python-headless<5`, `onnxruntime`.
```
analyze SRC --work WORK                         # probe, faces, contact sheets (Read them!)
words --work WORK --from FILE                   # transcript -> words.json (or write words.json directly)
autoplan --work WORK --style KEY --start S --end E   # overlay plan for one of the 3 styles
render WORK/plan.json [--preview] --out FILE    # 1080x1920, 30 fps, source audio + SFX
qa FILE --work WORK                             # size, duration, loudness
```
Graphics code: `scripts/gfx.py`. Plan fields: `references/plan-schema.md`.

## Workflow
1. Get the video (chat upload, or Google Drive search; Drive downloads over 10 MB fail → ask for an upload).
2. `analyze`, Read every contact sheet. Pick the 30 s window with the strongest line first (Cutter).
3. **Transcript** — you cannot hear audio. Working path: OpusClip `sign_upload` → `curl -X PUT` the clip to the signed
   storage.googleapis.com URL → `start_transcribe_project` → `wait_task` → `get_transcript` (word timings, Darija in
   Arabic script, speakers). Write words.json `[{"w","s","e","spk","emph"?}]`. Never make a Drive file public.
4. `autoplan --style KEY`, then fill the graphics from what is actually said (no invented facts, prices or names).
5. Render, then extract frames from the FINAL file at every graphic/caption moment and Read them
   (captions present at the bottom, Arabic RTL correct, nothing overlapping, graphics big and clear). Fix and re-render.
6. Deliver with SendUserFile (compress to ~7 Mbps so it plays in chat) and name the style used.

## Quality bar
- Video and audio untouched except added SFX; duration = window; 1080x1920 30 fps.
- Captions never overlap each other or the graphics; inside y 0.12–0.85; Arabic uses Cairo automatically.
- One idea per graphic; graphics change on the spoken beat; every graphic move has a soft sound, nothing louder than the voice.
- Reference videos from YouTube: OpusClip `start_link_download` → curl the URL → contact sheets + 4K frame grabs.
