# Styles extracted from reference videos (2026 "AI editing" tutorials)

Two long-form references were analysed frame by frame (scene cuts, slides, example reels):
"premium minimal / Arthur-Brooks style" and "minimal animation / viral talking head".
Everything below is implemented in the engine as packs `premium_minimal` and `cinematic_minimal`
(family `overlay`: the footage is NOT cut or re-timed, only graphics + sound are added).

## 1. Premium Minimal — viral talking head (`premium_minimal`)
Typography (from the reference "Captions & Typography" spec)
- Regular words: simple modern **sans**, warm white **#F3F3F3** (never pure white), weights varied (medium/black).
- Special words: a **script/serif italic** that is the *opposite* of the sans (if sans is bold, serif is light, and vice
  versa), in a **vibrant accent colour** (blue #2F7BFF in the references), **bigger**, with a soft **glow**.
  Engine: Montserrat + Playfair Display Italic; Arabic emphasis falls back to Cairo in the accent colour.
- **Placement**: lower third, centred. **Scale smaller than usual** (looks higher quality); only special words get big.
- Reveal: words appear one by one (fade + blur-in + small rise), not karaoke highlight.
Scene principles
- Hook: always show the main speaker; subtitles in the lower half; bolder font + colour + glow for special words.
- Focal point: the scene's main focus (person / text / object) sits in the main focal zone; supporting elements around it.
- Darken + blur behind lower-third animations so they stay readable (`fx.lower_shade`).
- "Use more dull colours": desaturated, cool grade (`grade: dull_cool`). "The less you use an effect, the more it hits."
- UI-style supporting elements: numbered step tracker 1—2—3 (`stickers: [{"steps":3,"active":2}]`), sliders, cards.
- "Make every element 25 % smaller."

## 2. Cinematic Minimal — story / quote (`cinematic_minimal`)
- Darkened, **blurred edges** (`fx.edge_blur`), **light paper texture** (`fx.paper`), dark cinematic grade.
- Small sans line + **one huge serif italic key word** on its own line, white with a blue glow (`cinematic_serif`).
- Graphics in the references: blue duotone cut-out figures on paper, thin glowing blue lines with a white dot,
  classical paintings with text, 3D brain/icons — use as stickers/images when the user supplies assets.

## 3. Sound design rules (from the reference sound-design doc)
1. Sound emphasises motion: every sound marks something visible (movement, pop, change, transition, build).
   If nothing happens on screen, nothing happens in the sound.
2. Three families: **whooshes** → movement (slides, pans, zooms, transitions); **textures** → things that happen
   without sliding (pops, clicks, reveals, write-ons, UI changes); **risers & hits** → anticipation and release.
3. Never too loud: whooshes sit low, textures a bit higher, risers highest; nothing covers the voice.
4. Under animations: SFX only, no music. Music lives under the talking head only.
5. One impact per scene. 6. Sound scale matches shot scale (wide = roomier, macro = small/intimate).
7. Diegetic first (real-world sound of the thing on screen). 8. The whoosh peak sits on the fastest frame.
Engine mapping: caption groups → `click` (premium) or `soft_whoosh` (cinematic) via `captions.sfx`;
emphasis words → one soft `impact`; transitions → whooshes; text cards → tick/impact.

## 4. Other families named in the references (for future packs)
Iman Gadzhi style, Vox documentary style, short-form animation, long-form YouTube talking head
(dark set, captions with italic accent word, floating UI cards with glow, chapter titles in serif italic, focus pulls).
