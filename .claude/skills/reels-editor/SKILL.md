---
name: reels-editor
description: Professional 2026-style editing of vertical Reels / TikTok / Shorts from a raw video. Use whenever the user gives a video (talking head, vlog, product, tutorial, podcast clip...) and asks for a reel, short, montage, "مونطاج", "ايديتينغ ديال الريلز", captions/subtitles, motion graphics, transitions, color grade or sound design. Runs a 4-role team (Director, Cutter, Motion Designer, Finisher) on a local ffmpeg/OpenCV/libass engine and delivers a 1080x1920 MP4.
---

# Reels Editor — 4-person editing team

You run a small post-production team. Each role has a dedicated agent in `.claude/agents/`;
in a single session you may play the roles yourself in order, or spawn the agents when the user
asks for the team. **The plan file `WORK/plan.json` is the shared timeline** — every role reads it,
edits only its own fields, and hands it on.

| # | Role (agent) | Owns in plan.json | Deliverable |
|---|--------------|-------------------|-------------|
| 1 | **Director / Story** (`reels-director`) | `segments[].in/out` (story order), `texts` hook + CTA, style choice | creative brief + first cut |
| 2 | **Editor / Cutter** (`reels-cutter`) | `segments` timing, `speed`, `zoom_from/to`, `crop_x`, `transition_in`, `shake`, `zoom_punches` | tight rhythm, 9:16 reframing |
| 3 | **Motion & Graphics** (`reels-motion-designer`) | `captions`, `texts`, `stickers`, `progress_bar`, word `emph` | animated captions, kinetic type, stickers |
| 4 | **Color, Sound & QA** (`reels-finisher`) | `grade`, `audio` (cleanup, SFX, music, loudness) | final render + QA report |

## Engine

`python3 .claude/skills/reels-editor/scripts/reelkit.py` (needs: ffmpeg with libass, numpy, Pillow,
`opencv-python-headless<5`; install with `pip install numpy pillow "opencv-python-headless<5"` if missing).

```
reelkit.py analyze SRC --work WORK         # probe, silences/speech blocks, scene cuts, face track, contact sheets
reelkit.py words --work WORK --from FILE   # transcript -> WORK/words.json (ElevenLabs/Whisper JSON, SRT, words list)
reelkit.py autoplan --work WORK --target 30 # draft plan.json: silence-cut beats, jump-cut zooms, transition cycle
reelkit.py render WORK/plan.json --preview # fast 540x960 check
reelkit.py render WORK/plan.json           # final 1080x1920 H.264 + AAC, -14 LUFS
reelkit.py qa WORK/final.mp4 --work WORK   # loudness / size / contact sheet
```
Full field reference: `references/plan-schema.md`.

## Workflow (follow in order)

1. **Intake.** Put the source in a work folder (e.g. `reels/<name>/`, never commit large videos).
   Ask only what you can't infer: target length (default 30 s), language of captions, brand colour, CTA.
2. **Analyze.** `reelkit.py analyze`. Then *look* at every `contact_*.jpg` with the Read tool — you
   must see the footage before deciding anything (framing, faces, B-roll moments, dead time).
3. **Transcript (for captions).** No speech model runs offline here. Options, in order:
   a. user supplies SRT/transcript; b. a connected transcription tool (ElevenLabs `creative_transcribe_audio`,
   Descript, OpusClip) — this uploads the user's audio, so ask once before using it;
   c. no captions (text-only graphics). Import with `reelkit.py words`.
   For Darija keep the speaker's own words in Arabic script; fix obvious ASR errors by hand.
4. **Director pass** → `references/trends-2026.md`: pick the hook (strongest line in the first 1.5 s),
   story order (hook → payoff/value → proof → CTA/loop), cut list to the target length, hook text.
5. **Cutter pass** → `references/motion-transitions.md`: remove silences/filler/breaths, 1.5–3.5 s beats,
   alternate zoom (1.0 ↔ 1.12–1.18) on jump cuts, transitions only where meaning changes, punch-ins on key words.
6. **Motion pass** → `references/captions-typography.md`: caption preset, emphasis words, kinetic texts,
   stickers (1 every 4–6 s max), safe zones.
7. **Finisher pass** → `references/color-sound.md`: grade preset, audio cleanup, SFX density, music + ducking.
8. **Preview → look → fix → final.** Render `--preview`, grab frames at caption/transition moments
   (`ffmpeg -ss T -i preview.mp4 -frames:v 1 x.png`) and Read them. Fix, then final render and `qa`.
9. **Deliver.** Send the MP4 with SendUserFile, plus a short list of what was done per role and 2–3
   options the user can ask for (another caption style, faster pace, other hook).

## Non-negotiables (quality bar)
- 1080x1920, 30 fps, H.264 High, AAC 192k, -14 LUFS, true peak ≤ -1 dBTP.
- Hook visible + audible in the first 1–1.5 s; no logo intro; no fade-from-black start.
- Something changes on screen every 1.5–3 s (cut, zoom, text, sticker, B-roll).
- Captions never in the IG/TikTok UI zones: keep text between y≈0.12 and y≈0.78 of the height, x margin ≥ 60 px.
- Arabic text: Cairo font; the engine handles RTL (`Encoding -1`). Do not put emoji inside ASS text — use `stickers`.
- Never invent content the speaker didn't say in captions. Never use copyrighted music unless the user provides it.
