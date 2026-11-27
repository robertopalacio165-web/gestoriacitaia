# House style — the approved look (use for every new video unless the user asks otherwise)

Approved by the user on the 60 s "MIDO CARS × PALACIO CARS — Black Friday" reel.
Full worked example: `references/examples/house_style_60s_plan.json` (copy it, then retime everything to the new transcript).

## Recipe
1. Footage untouched (no cuts, no zoom, no grade), its own voice + music kept. **No captions. No added music.**
2. Find car shots first (1 frame/s contact sheet): **nothing over car footage, never split a car shot.**
3. On people shots, one motion element every ~2–5 s, timed on the spoken word:
   - **Checklist** (big, above the heads, y 0.17, scale 1.75) for promises/points: ✓ on the exact word.
   - **Split-screen card** (`split.only_during_cards`) for a reveal word: yellow card, headline + mono tag, photo card, quote.
   - **Kinetic title** (GSAP `kinetic`) for the offer name (e.g. BLACK FRIDAY) + 🔥 Noto emoji on both sides.
   - **Light wipe** right before a full-screen **offer poster** (`inserts`) on the sentence that announces the offer.
   - **Price counter** (`price_counter`) on the amount (e.g. 0 → 4000€ "تخفيضات حتى") + 🤑.
   - **Lower thirds** when a person is named (name + business, e.g. المهدي / MIDO CARS, ROBERTO / PALACIO CARS).
   - **Flags** when countries are listed, flags pop on each spoken country + 🌍.
   - Reaction emoji (🤩 surprise, 👍 guarantee, 👋 welcome) small at x≈0.84, never on faces.
   - **CTA** "تابعونا" + brand line in the last 1.5–3 s.
   - Optional **contact** card (phone number) — see the phone-number note below.
4. Arabic text: Tajawal Black/ExtraBold only. Latin: Montserrat Black / Anton.
5. Sound: whoosh on every picture change (card in/out, poster, title), click on each ✓, impact on counters/titles,
   pop on emoji/flags. sfx_volume 0.6. Check true peak ≤ -1 dB.

## Phone numbers on screen (platform rules, checked Nov 2026)
- A phone number is not a copyright issue (copyright strikes are about music/footage you don't own).
- TikTok: off-platform contact details in promotional content can get posts removed/restricted (explicit for
  TikTok Shop sellers); commercial content must use the content-disclosure setting or it can lose For You eligibility.
- Instagram: no explicit ban found; recommendation limits target spam, unoriginal and low-quality content.
- Safest practice: show the number briefly (2–4 s, `contact` template) near the end, put it permanently in the bio /
  contact button, and say "النمرة ف البيو". Avoid a number burned on screen for the whole video.
