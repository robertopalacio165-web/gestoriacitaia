# The three reference reel styles (extracted frame by frame from the user's reference video)

## 1. Full Screen Talking Head  (`full_screen`)
- Calm on purpose: "no flashes, no zooms". Footage full frame; **face high up** in the frame.
- **Captions under the mouth, close to the eyes**: ONE word at a time, small (≈64 px at 1080w) white
  Inter SemiBold, no outline, soft shadow. The engine follows the face (`y_face` offset 0.16 below face centre).
- **Checklist graphics** at the bottom (y ≈ 0.82): dark glass rounded card (black ~80 %, thin light border),
  items in Inter SemiBold white; each item starts as an empty white circle and turns into a filled **coral ✓**
  (#E8603C) exactly when that point is spoken (`checks` times). Cards fade/rise in, one card per idea group.
  Arabic items: card becomes RTL (circle on the right).
- Small badge cards for tools/brands are allowed (icon + label on dark card).

## 2. Educational Split Screen  (`split_screen`)
- Speaker in the **bottom half** (crop around the face, `split.focus_y`), **graphics in the top half**.
- Top half = **paper/off-white grid** background, graphics **change about every second** on the spoken beat:
  - `headline`: huge condensed black title (Anton / Cairo Black) + small black **mono tags** (Space Mono, white text)
  - `yellow`: same but on a full yellow (#FFE500) card
  - `stat`: title + big red number + bar chart that grows, last bar red
  - `photo`: rounded photo card (a frame of the footage) with soft shadow, slight tilt, mono label
  - `quote`: one short line, serif italic (Latin) / Cairo (Arabic)
- **Captions on the seam line** (y = 0.5): 1–2 words, UPPERCASE **mono** (Space Mono Bold), white on a black box.

## 3. Cinematic  (`cinematic`)
- **Black & white** film look, contrast, heavy **film grain**, vignette, **warm orange/red light leak** drifting.
- **Words build one at a time**: the caption group (≤5 words, 2 lines) is shown dim and each word turns white
  when spoken; **keywords in a serif italic** (Instrument Serif; Arabic keywords Cairo, bigger).
- **Words behind the head**: huge red (#D61620) condensed word, vertically stretched (~1.65×), placed behind the
  person (u2net human segmentation), on the key word of a sentence. ≤ 1 per sentence, 0.7–1.8 s each.
  Avoid it on shots where the person is not clearly separated (e.g. inside a car).
- Optional: kinetic insert with scattered boxed mono words on black.

## Sound (all styles)
No music. Textures for things that appear without moving (checklist ticks → click, card changes → click),
soft whoosh for cards that slide/photo cards, a low impact when a behind-the-head word lands.
Source voice + music stay as recorded; SFX sit under the voice.
