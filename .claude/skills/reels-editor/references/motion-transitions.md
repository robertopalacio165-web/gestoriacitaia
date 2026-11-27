# Cutting, motion & transitions (Cutter's playbook)

## Rhythm
- Remove every silence > 0.25 s, ums/euh/"ااا", false starts, repeated sentences, breaths before sentences.
  Keep 60–100 ms of pad around words so consonants aren't clipped (analyze's speech blocks already pad 80 ms).
- Beat length: 1.5–3.5 s for high-energy, 2.5–4.5 s for aesthetic. Never > 5 s without a visual change
  (zoom punch, text, sticker, B-roll).
- Slow speaker: `speed` 1.1–1.2 on whole segments (voice stays natural up to ~1.2).
- Cut on the word, not on the pause; first frame after a cut should already have motion or speech.

## Jump-cut zoom alternation (the 2026 staple)
Segment A `1.00→1.05`, segment B `1.14→1.18`, segment C `1.00→1.05` ... hides jump cuts and adds energy.
Keep face eyes on the upper third: track mode does this automatically; tune `crop_y` (0.45–0.55) if needed.

## Transition vocabulary — use with meaning
| transition_in | when | SFX |
|---|---|---|
| `cut` | default, 70%+ of cuts | none |
| `punch` | new point / emphasis on a word | pop |
| `whip_left/right` | change of place, topic, "next" | whoosh |
| `whip_up/down` | list step, reveal from above/below | whoosh |
| `zoom_blur` | going "into" a detail / result | whoosh |
| `flash` | before/after, reveal, beat drop | flash |
| `glitch` | "wrong way", tech, surprise | glitch |
Max one non-cut transition every ~3 cuts. Never stack two flashy transitions back-to-back.

## Emphasis
- `zoom_punches` on the single most important word of each beat (amount 1.10–1.18, dur 0.3–0.5).
- `shake` 0.3–0.6 only on impacts/punchlines, for one segment.
- Speed ramp: split a moment into two segments, first `speed` 1.6–2.0, then 1.0.

## Reframing
- `auto` → `track` when a face is found in a horizontal source, `center` for vertical source,
  `blurfill` for horizontal footage with no face (screens, landscapes, products).
- Per-segment `crop_x` overrides the tracker (e.g. 0.3 to show a product on the left).
