# Cutter's playbook — story, hook, rhythm

## Story structure (30 s)
| Time | Beat | Purpose |
|---|---|---|
| 0–1.5 s | Hook: strongest line/shot + hook text | stop the scroll |
| 1.5–5 s | Promise / context | earn the rest |
| 5–24 s | 3 value beats or story beats, pattern interrupt every 2–3 s | retention |
| 24–28 s | Payoff: result, reveal, punchline | satisfaction, shares |
| 28–30 s | CTA or seamless loop into frame 1 | comments, rewatch |
Hook formulas: bold claim, number ("3 حوايج..."), result first, warning ("حبس..."), open loop, question.
Choose the **best** 30 s, not the first 30 s; re-ordering is allowed (best line first).

## Talking-head cutting
- Cut every silence > 0.25 s, ums/"ااا"/euh, false starts, repeats, breaths. Keep 60–100 ms pad.
- Beats 1.5–3.5 s (energy) / 2.5–4.5 s (calm). `speed` 1.05–1.2 for slow speakers (natural up to ~1.2).
- Jump-cut zoom alternation: 1.00→1.05 then 1.14→1.18, repeat. Eyes on the upper third (`crop_y` 0.45–0.55).
- 1 `zoom_punch` per beat on the key word (output time), amount 1.10–1.18, dur 0.3–0.5.

## Montage cutting (cars, products, travel)
- Run `beats` on the music; cut on beats (every 1–2 beats in hype, 2–4 in luxury). The autoplan already
  sizes slots from the beat grid and fills them with the most active moments (motion energy + scene cuts).
- Speed ramps: source chunk longer than its slot → plays fast (1.3–2.0x) — used for drive-bys and reveals;
  follow a fast segment with a 1.0x hero shot. Hero shots (car front, logo, interior detail) 1.5–2.5 s.
- Order: attention shot → details (wheels, lights, interior, sound of engine) → driving → hero/reveal → logo/CTA.
- Avoid repeating the same shot unless it is a deliberate callback at the end (loop).

## Reframing
`auto` → `track` (face, horizontal source), `center` (vertical source), `blurfill` (horizontal, no face).
Per-segment `crop_x` to frame a car/product off-centre (0.3 / 0.7).
