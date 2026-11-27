# The two reference reel styles (extracted frame by frame from the user's reference video)

## 1. Full Screen Talking Head  (`full_screen`)
- Calm on purpose: "no flashes, no zooms". Footage full frame; **face high up** in the frame.
- Captions: user rule overrides the reference — ALWAYS at the bottom with thick letters (see SKILL.md).
- **Checklist graphics BIG and ABOVE the heads** (scale ≈ 1.75, y ≈ 0.17; user rule): dark glass rounded card (black ~80 %, thin light border),
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
- Captions: ALWAYS at the bottom with thick letters (user rule), not on the seam.

## Sound (all styles)
No music. Textures for things that appear without moving (checklist ticks → click, card changes → click),
soft whoosh for cards that slide/photo cards.
Source voice + music stay as recorded; SFX sit under the voice.
