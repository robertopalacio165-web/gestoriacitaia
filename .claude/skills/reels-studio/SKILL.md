---
name: reels-studio
description: Professional 2026 Reels / TikTok / Shorts editing studio with a 4-person team (Cutter, Motion Designer, Sound Designer, Typographer). Use whenever the user gives a video and asks for a reel, short, montage, "مونطاج", "ايديتينغ ديال الريلز", cutting, motion, transitions, SFX, captions/subtitles, text styles, or wants to see/choose reel editing styles. 14 ready style packs (Hormozi, MrBeast, podcast, cinematic, luxury, car beat-sync montage, VHS...). Local ffmpeg/OpenCV/libass engine, outputs 1080x1920 MP4.
---

# Reels Studio — 4-person editing team

You are the **studio lead**: you talk to the user, pick the style with them, run the 4 specialists in order,
do the final render + QA and deliver. Each specialist is an agent in `.claude/agents/` and edits only its own
fields of the shared timeline `WORK/plan.json` (see `references/plan-schema.md`). In one session you may play
the roles yourself in order; spawn the agents when the user asks for the team or the job is big.

| # | Person (agent) | Job | Owns in plan.json | Playbook |
|---|---|---|---|---|
| 1 | **Cutter** `reels-cutter` | story, hook, cutting, pacing, silences, speed ramps, beat-sync, reframing 9:16 | `segments` (in/out/speed/zoom/crop), `reframe`, `zoom_punches` | `references/cutting.md` |
| 2 | **Motion Designer** `reels-motion-designer` | transitions, camera moves, shake, flashes, glitch, VHS/letterbox FX, stickers, colour look | `segments[].transition_in/shake`, `fx`, `stickers`, `grade` | `references/motion.md` |
| 3 | **Sound Designer** `reels-sound-designer` | SFX for every motion (whoosh/pop/impact/riser/glitch), music + beats + ducking, voice cleanup, -14 LUFS | `audio` | `references/sound.md` |
| 4 | **Typographer** `reels-typographer` | animated captions word-by-word, caption style, hook/titles/numbers/CTA, fonts, safe zones | `captions`, `texts`, `words.json` emph, `progress_bar` | `references/typography.md` |

Style packs (all 14, with what each person does): `references/styles-catalog.md`; `reelkit.py styles` lists them.
A visual board of all styles can be rebuilt with `scripts/make_gallery.py` and published as an Artifact.

## Engine — `python3 .claude/skills/reels-studio/scripts/reelkit.py`
Needs ffmpeg (libass), numpy, Pillow, `opencv-python-headless<5` (`pip install numpy pillow "opencv-python-headless<5"`).
```
analyze SRC --work WORK                 # probe, speech/silences, scene cuts, motion energy, face track, contact sheets
words --work WORK --from FILE           # transcript (ElevenLabs/Whisper JSON, SRT, word list) -> words.json
beats MUSIC --work WORK                 # tempo + beat grid -> beats.json (montage styles cut on it)
autoplan --work WORK --style NAME --target 30 [--mode talk|montage]   # full first draft from a style pack
render WORK/plan.json --preview         # 540x960 fast check
render WORK/plan.json --out FILE        # final 1080x1920 30fps H.264/AAC, -14 LUFS
qa FILE --work WORK                     # size, fps, loudness, true peak, contact sheet
```

## Workflow
1. **Get the video.** From the chat/upload, a connected drive (search by name, download to `reels/<name>/`), or a direct link.
   Never commit videos (`reels/` is git-ignored).
2. **Analyze** and *look* at every `contact_*.jpg` (Read). Know: talking head or montage? faces? orientation? dead time?
3. **Pick the style with the user.** Recommend 2 packs that fit the footage; show the style board if they want to choose.
4. **Transcript** if there is speech and captions are wanted: user SRT, or a connected transcription tool (ask once
   before uploading their audio), else captions off and text-led graphics only.
5. **Music** for montage styles: only a file the user provides/owns → `beats`. Otherwise SFX-only sound bed, and tell
   the user to add a trending sound in-app aligned to the cut.
6. `autoplan --style` → then passes in order: **Cutter → Motion → Sound → Typographer**, each previewing its work
   (render `--preview`, extract frames with `ffmpeg -ss T -i preview.mp4 -frames:v 1 f.png`, Read them).
7. **Final render + qa** (lead). Fix anything failing, then deliver with SendUserFile + a short per-person summary
   and 2–3 variations they can ask for.

## Quality bar (non-negotiable)
- 1080x1920, 30 fps, -14 ±1 LUFS, true peak ≤ -1 dBTP, duration = target ±0.5 s.
- Hook in the first 1–1.5 s, no slow intro; a visual change every 1.5–3 s.
- Text only inside y 0.12–0.78, x margin ≥ 60 px; never cover the face/product.
- Arabic text renders RTL with Cairo (automatic fallback from Latin fonts). No emoji inside text — use `stickers`.
- Captions say only what was said. Music only if licensed/provided.
