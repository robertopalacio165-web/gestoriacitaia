"""
Motion-graphics libraries for Reels Studio.

1) GSAP templates (assets/motion/templates.html) rendered by headless Chromium (motion_render.js) to
   transparent PNG frames: price_counter, lower_third, flags, cta, kinetic, light_wipe.
   plan["motion"] = [{"template": "...", "start": s, "end": e, "params": {...}}]

2) Google Noto Animated Emoji (Lottie, by name) rendered with rlottie:
   plan["lotties"] = [{"name": "fire", "start": s, "end": e, "x": .8, "y": .3, "size": 260}]
   Files are cached in assets/lottie/<code>.json (downloaded from fonts.gstatic.com on first use).
"""
import hashlib
import json
import os
import subprocess
import urllib.request
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
SKILL = HERE.parent
LOTTIE_DIR = SKILL / "assets" / "lottie"

# name -> Noto emoji code point(s) (https://googlefonts.github.io/noto-emoji-animation/)
EMOJI = {
    "fire": "1f525", "check": "2705", "car": "1f697", "party": "1f389", "starstruck": "1f929", "thumbsup": "1f44d",
    "rocket": "1f680", "star": "2b50", "100": "1f4af", "clap": "1f44f", "eyes": "1f440", "pointdown": "1f447",
    "heart": "2764_fe0f", "sparkles": "2728", "gift": "1f381", "trophy": "1f3c6", "bell": "1f514", "megaphone": "1f4e3",
    "handshake": "1f91d", "money": "1f4b8", "moneyface": "1f911", "wow": "1f62e", "mindblown": "1f92f", "cool": "1f60e",
    "wave": "1f44b", "muscle": "1f4aa", "ok": "1f44c", "lightning": "26a1", "alarm": "1f6a8", "confetti": "1f38a",
    "smile": "1f600", "laugh": "1f602", "love": "1f60d", "think": "1f914", "pray": "1f64f", "globe": "1f30d",
    "key": "1f511", "crown": "1f451", "gem": "1f48e", "chart": "1f4c8",
}


def lottie_path(name):
    code = EMOJI.get(name, name)
    LOTTIE_DIR.mkdir(parents=True, exist_ok=True)
    p = LOTTIE_DIR / f"{code}.json"
    if not p.exists():
        url = f"https://fonts.gstatic.com/s/e/notoemoji/latest/{code}/lottie.json"
        with urllib.request.urlopen(url, timeout=30) as r:
            p.write_bytes(r.read())
    return p


@lru_cache(maxsize=32)
def _anim(name):
    from rlottie_python import LottieAnimation
    a = LottieAnimation.from_file(str(lottie_path(name)))
    return a, a.lottie_animation_get_totalframe(), a.lottie_animation_get_framerate()


@lru_cache(maxsize=4096)
def lottie_frame(name, idx, size):
    a, n, _ = _anim(name)
    im = a.render_pillow_frame(frame_num=idx % max(1, n), width=size, height=size)
    return np.asarray(im.convert("RGBA"))


def draw_lotties(frame, items, t):
    from gfx import ease_back, paste_rgba
    H, W = frame.shape[:2]
    for it in items:
        d = t - it["start"]
        if d < 0 or t > it["end"]:
            continue
        _, n, fr = _anim(it["name"])
        size = int(it.get("size", 260) * W / 1080)
        img = Image.fromarray(lottie_frame(it["name"], int(d * fr), size))
        sc = ease_back(min(1, d / 0.3)) * min(1.0, (it["end"] - t) / 0.2)
        if sc <= 0.02:
            continue
        if abs(sc - 1) > 0.01:
            img = img.resize((max(1, int(size * sc)), max(1, int(size * sc))), Image.BICUBIC)
        paste_rgba(frame, img, it.get("x", 0.5) * W - img.width / 2, it.get("y", 0.3) * H - img.height / 2)


# ----------------------------------------------------------------------------- GSAP templates
def prerender_motion(plan, work, fps=30):
    jobs, items = [], []
    for m in plan.get("motion", []):
        dur = round(m["end"] - m["start"], 3)
        key = hashlib.sha1(json.dumps([m["template"], m.get("params", {}), dur, fps], sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:12]
        out = Path(work) / "_motion" / f"{m['template']}_{key}"
        m["_dir"] = str(out)
        if not (out / "done").exists():
            jobs.append({"template": m["template"], "params": m.get("params", {}), "duration": dur, "fps": fps, "out": str(out)})
    if jobs:
        jf = Path(work) / "_motion" / "jobs.json"
        jf.parent.mkdir(parents=True, exist_ok=True)
        jf.write_text(json.dumps(jobs, ensure_ascii=False))
        env = dict(os.environ)
        try:
            env["NODE_PATH"] = subprocess.run(["npm", "root", "-g"], capture_output=True, text=True).stdout.strip()
        except Exception:
            pass
        subprocess.run(["node", str(HERE / "motion_render.js"), str(jf)], check=True, env=env)


@lru_cache(maxsize=256)
def _motion_png(path):
    return Image.open(path).convert("RGBA")


def draw_motion(frame, items, t, fps=30):
    from gfx import paste_rgba
    H, W = frame.shape[:2]
    for m in items:
        if not (m["start"] <= t < m["end"]) or "_dir" not in m:
            continue
        idx = int((t - m["start"]) * fps)
        p = Path(m["_dir"]) / f"{idx:05d}.png"
        if not p.exists():
            continue
        im = Image.open(p).convert("RGBA")
        if im.size != (W, H):
            im = im.resize((W, H), Image.BILINEAR)
        paste_rgba(frame, im, 0, 0)
