#!/usr/bin/env python3
"""Render one preview frame per style pack from a source clip and build the style-board HTML.
usage: make_gallery.py SRC --work DIR --out board.html [--seconds 4]"""
import argparse, base64, html, io, json, shutil, subprocess, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from styles import STYLES
K = str(HERE / "reelkit.py")
AR = "هاد الطوموبيل غادي تبهرك بزاف".split()
EN = "THIS CAR WILL BLOW YOUR MIND".split()
LATIN = {"luxury_showcase", "cinematic_vlog", "car_hype_montage", "retro_vhs"}

ap = argparse.ArgumentParser(); ap.add_argument("src"); ap.add_argument("--work", required=True)
ap.add_argument("--out", required=True); ap.add_argument("--hook", default="ROBERTO CARS"); ap.add_argument("--seconds", type=float, default=4)
a = ap.parse_args()
base = Path(a.work); base.mkdir(parents=True, exist_ok=True)
subprocess.run(["python3", K, "analyze", a.src, "--work", str(base / "base"), "--every", "4"], check=True)
cards = []
for name, st in STYLES.items():
    w = base / name
    shutil.rmtree(w, ignore_errors=True); shutil.copytree(base / "base", w)
    toks = EN if name in LATIN else AR
    json.dump([{"w": t, "s": 0.1 + i * 0.42, "e": 0.48 + i * 0.42, **({"emph": True} if i == 2 else {})} for i, t in enumerate(toks)],
              open(w / "words.json", "w"), ensure_ascii=False)
    subprocess.run(["python3", K, "autoplan", "--work", str(w), "--style", name, "--target", str(a.seconds), "--mode", "talk"], check=True, capture_output=True)
    p = json.load(open(w / "plan.json"))
    hp = st.get("texts", {}).get("hook", "hook")
    p["texts"] = [{"text": a.hook, "preset": hp, "start": 0, "end": a.seconds, "y": 0.3 if hp == "big" else 0.22, "anim": "pop"}]
    if st.get("stickers_every"):
        p["stickers"] = [{"emoji": "🔥", "start": 0.5, "end": a.seconds, "x": 0.8, "y": 0.45, "size": 160}]
    p["audio"]["sfx"] = False
    p["segments"] = [{**p["segments"][0], "in": 0, "out": a.seconds, "speed": 1.0, "zoom_from": 1.05, "zoom_to": 1.08}]
    p["fx"].pop("beats_out", None)
    json.dump(p, open(w / "plan.json", "w"), ensure_ascii=False)
    subprocess.run(["python3", K, "render", str(w / "plan.json"), "--preview"], check=True, capture_output=True)
    jpg = w / "frame.jpg"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "1.05", "-i", str(w / "preview.mp4"), "-frames:v", "1", "-q:v", "5", str(jpg)], check=True)
    d = "data:image/jpeg;base64," + base64.b64encode(jpg.read_bytes()).decode()
    c = st["cut"]
    cards.append(f'''<article class="card" id="{name.replace('_', '-')}"><figure><img src="{d}" alt="{html.escape(st['title'])}" width="540" height="960" loading="lazy"></figure>
<div class="body"><h3>{html.escape(st['title'])}</h3><p class="en">{html.escape(st['desc'])}</p>
<dl><div><dt>Cut</dt><dd>{c['beat']}s beats{', speed ramps' if c.get('ramp') else ''}</dd></div><div><dt>Motion</dt><dd>{', '.join(sorted(set(c['transitions'])))}</dd></div>
<div><dt>Text</dt><dd>{st['captions']['preset']}</dd></div><div><dt>Look</dt><dd>{st['grade']['preset']}</dd></div></dl>
<button type="button" class="code" data-code="{name}"><span>{name}</span><small>نسخ</small></button></div></article>''')
    print("ok", name, flush=True)
Path(a.out).write_text((HERE.parent / "assets" / "gallery_template.html").read_text().replace("%%CARDS%%", "\n".join(cards)))
print("board ->", a.out)
