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

**User rules (non-negotiable):**
- Default: NO captions/subtitles unless the user asks. Only motion graphics + motion SFX.
- Arabic text = clear bold **Tajawal Black/ExtraBold** (like the user's Black Friday poster). Never Lalezar or other
  decorative/thin Arabic fonts — the user finds them unreadable.
- **Never put text or graphics over car footage, and never split-screen a car shot.** Find car shots first
  (contact sheet at 1 frame/s) and keep every checklist / split card outside those time ranges.
- Graphics big and where the audience sees them: checklists above the heads (scale ≈1.75, y ≈0.17).
- Mixed mode: `split.only_during_cards: true` → full screen, splitting only while a card is on.
- Offer/poster images the user gives: full-screen `inserts` timed on the sentence that announces the offer.
- Motion SFX must be audible: whoosh on every picture change (card in/out, poster), click on each ✓, sfx_volume ≈0.6.
- If captions are requested: always at the bottom, thick Tajawal, never mid-screen.

## The team (agents in `.claude/agents/`)
| # | Person | Owns in `WORK/plan.json` |
|---|---|---|
| 1 | **Cutter** `reels-cutter` | picks the 30 s window (`segments[0].in/out`), framing (`reframe`, `split.focus_y`) — no cuts unless the user asks |
| 2 | **Motion Designer** `reels-motion-designer` | `checklists`, `split.cards`, `inserts`, `grade` |
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

## Motion-graphics libraries (bundled)
1. **GSAP 3** (`assets/vendor/gsap.min.js`, GreenSock standard no-charge license) — templates in
   `assets/motion/templates.html`, rendered frame-exact by headless Chromium (`scripts/motion_render.js`, Playwright):
   `price_counter` (gold number counting up + Arabic label + light sweep), `lower_third` (name + role tag),
   `flags` (title + flags popping on the spoken times), `cta` (follow button + pointer, pulsing), `kinetic`
   (big masked title, gold line), `light_wipe` (full-frame light streak for picture changes).
   Plan: `"motion": [{"template","start","end","params":{...}}]`. New templates = add a function to `T` in templates.html.
2. **Google Noto Animated Emoji** (Lottie, rendered by rlottie, `scripts/motionlib.py`): 40 names in `EMOJI`
   (fire, check, car, party, starstruck, thumbsup, rocket, 100, money, moneyface, globe, wave, handshake, trophy...),
   cached in `assets/lottie/`. Plan: `"lotties": [{"name","start","end","x","y","size"}]`.
Every motion element gets its sound automatically (whoosh in, impact on counters/titles, pop on emoji and flags).
Needs: `pip install rlottie-python`, Node + Playwright (pre-installed Chromium).
