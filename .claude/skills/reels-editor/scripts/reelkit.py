#!/usr/bin/env python3
"""
reelkit.py — engine for professional vertical Reels/TikTok/Shorts edits (2026 style).

Subcommands
  analyze  SRC --work DIR           probe, silences, scene cuts, face track, contact sheets
  words    --work DIR --from FILE    import a transcript (ElevenLabs/Whisper JSON, SRT, words.json)
  autoplan --work DIR [--target 30] build a first-draft plan.json from speech + silences
  render   PLAN [--out FILE] [--preview]   render the plan to an MP4
  qa       VIDEO --work DIR          loudness / duration / contact sheet of the result

Everything is local: ffmpeg + numpy + OpenCV + libass. No network.
"""
import argparse, json, math, os, re, shutil, subprocess, sys, random
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
SKILL = HERE.parent
FONTS = SKILL / "assets" / "fonts"
CASCADE = SKILL / "assets" / "models" / "haarcascade_frontalface_default.xml"


# --------------------------------------------------------------------------- utils
def run(cmd, **kw):
    kw.setdefault("check", True)
    return subprocess.run(cmd, **kw)


def ffprobe(src):
    out = run(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams",
               "-show_format", str(src)], capture_output=True, text=True).stdout
    j = json.loads(out)
    v = next((s for s in j["streams"] if s["codec_type"] == "video"), None)
    a = next((s for s in j["streams"] if s["codec_type"] == "audio"), None)
    if v is None:
        sys.exit("no video stream")
    w, h = int(v["width"]), int(v["height"])
    rot = 0
    for sd in v.get("side_data_list", []) or []:
        if "rotation" in sd:
            rot = int(float(sd["rotation"]))
    rot = int(v.get("tags", {}).get("rotate", rot))
    if abs(rot) % 180 == 90:
        w, h = h, w
    num, den = v.get("avg_frame_rate", "30/1").split("/")
    fps = float(num) / float(den) if float(den) else 30.0
    dur = float(j["format"].get("duration") or v.get("duration") or 0)
    return {"w": w, "h": h, "fps": fps, "duration": dur, "has_audio": a is not None,
            "rotation": rot, "codec": v.get("codec_name")}


def hex_to_bgr(h):
    h = h.lstrip("#")
    return (int(h[4:6], 16), int(h[2:4], 16), int(h[0:2], 16))


def hex_to_ass(h, alpha=0):
    h = h.lstrip("#")
    return f"&H{alpha:02X}{h[4:6]}{h[2:4]}{h[0:2]}".upper()


def ease_out(x):
    x = min(max(x, 0.0), 1.0)
    return 1 - (1 - x) ** 3


def ease_in_out(x):
    x = min(max(x, 0.0), 1.0)
    return 3 * x * x - 2 * x * x * x


def has_arabic(s):
    return bool(re.search(r"[؀-ۿ]", s or ""))


# --------------------------------------------------------------------------- analyze
def detect_silences(src, noise_db=-35, min_d=0.35):
    p = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(src), "-vn", "-af",
             f"silencedetect=noise={noise_db}dB:d={min_d}", "-f", "null", "-"],
            capture_output=True, text=True, check=False)
    sil, start = [], None
    for line in p.stderr.splitlines():
        m = re.search(r"silence_start: ([\d.\-e]+)", line)
        if m:
            start = max(0.0, float(m.group(1)))
        m = re.search(r"silence_end: ([\d.\-e]+)", line)
        if m and start is not None:
            sil.append([round(start, 3), round(float(m.group(1)), 3)])
            start = None
    return sil


def detect_scenes(src, thr=0.32):
    p = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(src), "-an", "-vf",
             f"scale=320:-2,select='gt(scene,{thr})',showinfo", "-f", "null", "-"],
            capture_output=True, text=True, check=False)
    return [round(float(m.group(1)), 3) for m in re.finditer(r"pts_time:([\d.]+)", p.stderr)]


def read_frames(src, start, dur, w, h, fps, speed=1.0):
    """Yield BGR frames (h,w,3) for [start, start+dur) resampled to fps, scaled to w x h."""
    vf = f"setpts=(PTS-STARTPTS)/{speed},fps={fps},scale={w}:{h}:flags=bicubic"
    cmd = ["ffmpeg", "-v", "error", "-ss", f"{start:.3f}", "-t", f"{dur:.3f}", "-i", str(src),
           "-an", "-vf", vf, "-f", "rawvideo", "-pix_fmt", "bgr24", "-"]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    n = w * h * 3
    try:
        while True:
            buf = p.stdout.read(n)
            if len(buf) < n:
                break
            yield np.frombuffer(buf, np.uint8).reshape(h, w, 3)
    finally:
        p.stdout.close()
        p.wait()


def face_track(src, info, sample_fps=4):
    """Return list of [t, cx, cy, fh] normalized (0..1) for the biggest face."""
    import cv2
    det = cv2.CascadeClassifier(str(CASCADE))
    sw = 360
    sh = int(round(info["h"] * sw / info["w"] / 2) * 2)
    track = []
    for i, f in enumerate(read_frames(src, 0, info["duration"], sw, sh, sample_fps)):
        g = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)
        faces = det.detectMultiScale(g, 1.15, 5, minSize=(int(sw * 0.08), int(sw * 0.08)))
        if len(faces):
            x, y, fw, fh = max(faces, key=lambda r: r[2] * r[3])
            track.append([round(i / sample_fps, 3), round((x + fw / 2) / sw, 4),
                          round((y + fh / 2) / sh, 4), round(fh / sh, 4)])
    return track


def contact_sheets(src, info, outdir, every=2.0, cols=5, rows=4):
    from PIL import Image, ImageDraw, ImageFont
    tw = 216
    th = int(tw * info["h"] / info["w"])
    font = ImageFont.truetype(str(FONTS / "Montserrat-Black.ttf"), 22)
    frames = list(read_frames(src, 0, info["duration"], tw, th - th % 2, 1.0 / every))
    th = th - th % 2
    paths, per = [], cols * rows
    for s in range(0, len(frames), per):
        chunk = frames[s:s + per]
        sheet = Image.new("RGB", (cols * tw, math.ceil(len(chunk) / cols) * th), "black")
        d = ImageDraw.Draw(sheet)
        for k, f in enumerate(chunk):
            x, y = (k % cols) * tw, (k // cols) * th
            sheet.paste(Image.fromarray(f[:, :, ::-1]), (x, y))
            t = (s + k) * every
            d.rectangle([x, y, x + 86, y + 30], fill="black")
            d.text((x + 6, y + 3), f"{t:5.1f}s", font=font, fill="yellow")
        p = outdir / f"contact_{s // per:02d}.jpg"
        sheet.save(p, quality=85)
        paths.append(str(p))
    return paths


def loudness(path):
    p = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-vn", "-af",
             "loudnorm=print_format=json", "-f", "null", "-"], capture_output=True, text=True, check=False)
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", p.stderr, re.S)
    if not m:
        return None
    j = json.loads(m.group(0))
    return {"lufs": float(j["input_i"]), "true_peak": float(j["input_tp"]), "lra": float(j["input_lra"])}


def cmd_analyze(a):
    work = Path(a.work)
    work.mkdir(parents=True, exist_ok=True)
    src = Path(a.src).resolve()
    info = ffprobe(src)
    info["source"] = str(src)
    print(f"[analyze] {info['w']}x{info['h']} {info['fps']:.2f}fps {info['duration']:.1f}s audio={info['has_audio']}")
    res = {"info": info}
    if info["has_audio"]:
        run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-vn", "-ac", "1", "-ar", "16000",
             str(work / "audio16k.wav")])
        res["silences"] = detect_silences(src, a.noise_db, a.min_silence)
        res["loudness"] = loudness(src)
        sp, last = [], 0.0
        for s, e in res["silences"]:
            if s - last > 0.05:
                sp.append([round(last, 3), round(s, 3)])
            last = e
        if info["duration"] - last > 0.05:
            sp.append([round(last, 3), round(info["duration"], 3)])
        res["speech"] = sp
        print(f"[analyze] speech blocks: {len(sp)}  silences: {len(res['silences'])}  loudness: {res['loudness']}")
    res["scenes"] = detect_scenes(src)
    print(f"[analyze] scene cuts: {len(res['scenes'])}")
    if not a.no_faces:
        res["faces"] = face_track(src, info)
        cov = len(res["faces"]) / max(1, info["duration"] * 4)
        print(f"[analyze] face samples: {len(res['faces'])} (coverage {cov:.0%})")
    res["contact_sheets"] = contact_sheets(src, info, work, every=a.every)
    print("[analyze] contact sheets:", *res["contact_sheets"], sep="\n  ")
    (work / "analysis.json").write_text(json.dumps(res, indent=1, ensure_ascii=False))
    print(f"[analyze] wrote {work / 'analysis.json'}")


# --------------------------------------------------------------------------- words
def cmd_words(a):
    work = Path(a.work)
    src = Path(a.src)
    words = []
    if src.suffix.lower() == ".srt":
        txt = src.read_text(encoding="utf-8-sig")
        for blk in re.split(r"\n\s*\n", txt.strip()):
            lines = blk.strip().splitlines()
            m = next((re.match(r"(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)", l) for l in lines if "-->" in l), None)
            if not m:
                continue
            g = list(map(int, m.groups()))
            t0 = g[0] * 3600 + g[1] * 60 + g[2] + g[3] / 1000
            t1 = g[4] * 3600 + g[5] * 60 + g[6] + g[7] / 1000
            text = " ".join(l for l in lines if "-->" not in l and not l.strip().isdigit())
            toks = text.split()
            tot = sum(len(t) for t in toks) or 1
            t = t0
            for tok in toks:  # distribute time by character count
                d = (t1 - t0) * len(tok) / tot
                words.append({"w": tok, "s": round(t, 3), "e": round(t + d, 3)})
                t += d
    else:
        j = json.loads(src.read_text(encoding="utf-8"))
        if isinstance(j, dict) and "words" in j:            # ElevenLabs Scribe / generic
            for w in j["words"]:
                if w.get("type", "word") != "word":
                    continue
                words.append({"w": (w.get("text") or w.get("word")).strip(), "s": float(w.get("start")), "e": float(w.get("end"))})
        elif isinstance(j, dict) and "segments" in j:       # Whisper verbose_json
            for sg in j["segments"]:
                for w in sg.get("words", []):
                    words.append({"w": w["word"].strip(), "s": float(w["start"]), "e": float(w["end"])})
        elif isinstance(j, list):                           # already words.json
            for w in j:
                words.append({"w": w.get("w") or w.get("word") or w.get("text"),
                              "s": float(w.get("s", w.get("start"))), "e": float(w.get("e", w.get("end"))),
                              **({"emph": True} if w.get("emph") else {})})
    words = [w for w in words if w["w"]]
    (work / "words.json").write_text(json.dumps(words, ensure_ascii=False, indent=0))
    print(f"[words] {len(words)} words -> {work / 'words.json'}")


# --------------------------------------------------------------------------- autoplan
def cmd_autoplan(a):
    work = Path(a.work)
    an = json.loads((work / "analysis.json").read_text())
    info = an["info"]
    pad = 0.08
    blocks = an.get("speech") or [[0, info["duration"]]]
    blocks = [[max(0, s - pad), min(info["duration"], e + pad)] for s, e in blocks if e - s > 0.25]
    # split long blocks into 1.5–3.5 s beats so the edit keeps moving
    beats = []
    for s, e in blocks:
        n = max(1, round((e - s) / 2.6))
        step = (e - s) / n
        for i in range(n):
            beats.append([round(s + i * step, 3), round(s + (i + 1) * step, 3)])
    # choose the densest window that fills the target (default: start from the top)
    out, total = [], 0.0
    for s, e in beats:
        if total >= a.target:
            break
        if total + (e - s) > a.target:
            e = s + (a.target - total)
        out.append([s, e])
        total += e - s
    trans_cycle = ["cut", "punch", "cut", "whip_left", "cut", "punch", "flash", "cut", "zoom_blur", "cut", "glitch"]
    segs = []
    for i, (s, e) in enumerate(out):
        z_a, z_b = (1.0, 1.06) if i % 2 == 0 else (1.14, 1.18)  # classic jump-cut zoom alternation
        segs.append({"in": s, "out": round(e, 3), "speed": 1.0, "zoom_from": z_a, "zoom_to": z_b,
                     "transition_in": "cut" if i == 0 else trans_cycle[i % len(trans_cycle)]})
    plan = {
        "source": info["source"],
        "output": {"w": 1080, "h": 1920, "fps": 30, "crf": 18},
        "reframe": "auto",
        "segments": segs,
        "words": str(work / "words.json") if (work / "words.json").exists() else None,
        "captions": {"enabled": (work / "words.json").exists(), "preset": "bold_pop", "max_words": 3,
                     "y": 0.66, "font": "Cairo", "size": 92, "highlight": "#FFE600"},
        "texts": [],
        "stickers": [],
        "zoom_punches": [],
        "progress_bar": {"enabled": True, "color": "#FFE600", "height": 9},
        "grade": {"preset": "punchy", "grain": 4, "vignette": True, "sharpen": True},
        "audio": {"loudness": -14, "cleanup": True, "sfx": True, "sfx_volume": 0.5, "music": None, "music_volume": 0.12},
    }
    (work / "plan.json").write_text(json.dumps(plan, indent=1, ensure_ascii=False))
    print(f"[autoplan] {len(segs)} segments, {total:.1f}s -> {work / 'plan.json'}")


# --------------------------------------------------------------------------- render: timeline
def build_timeline(plan):
    fps = plan["output"]["fps"]
    t, tl = 0.0, []
    for i, s in enumerate(plan["segments"]):
        sp = float(s.get("speed", 1.0))
        dur = (s["out"] - s["in"]) / sp
        nf = max(1, int(round(dur * fps)))
        tl.append({**s, "idx": i, "t0": t, "nf": nf, "odur": nf / fps, "speed": sp})
        t += nf / fps
    return tl, t


def src_to_out(tl, ts):
    for s in tl:
        if s["in"] - 1e-3 <= ts <= s["out"] + 1e-3:
            return s["t0"] + (ts - s["in"]) / s["speed"]
    return None


def remap_words(words, tl):
    out = []
    for w in words:
        for s in tl:
            # keep a word when its middle lies inside the kept segment
            mid = (w["s"] + w["e"]) / 2
            if s["in"] <= mid <= s["out"]:
                a = s["t0"] + (max(w["s"], s["in"]) - s["in"]) / s["speed"]
                b = s["t0"] + (min(w["e"], s["out"]) - s["in"]) / s["speed"]
                out.append({**w, "s": a, "e": max(b, a + 0.08), "seg": s["idx"]})
                break
    out.sort(key=lambda w: w["s"])
    return out


# --------------------------------------------------------------------------- render: frames (motion engine)
class Tracker:
    def __init__(self, faces, default=0.5):
        self.f = faces or []
        self.default = default

    def at(self, t):
        if not self.f:
            return self.default, 0.42
        # smoothed: weighted average over a ±0.8 s window (stable, no jitter)
        ws, xs, ys = 0.0, 0.0, 0.0
        for ft, cx, cy, _ in self.f:
            d = abs(ft - t)
            if d < 0.8:
                w = 1 - d / 0.8
                ws += w; xs += w * cx; ys += w * cy
        if ws == 0:
            near = min(self.f, key=lambda r: abs(r[0] - t))
            return near[1], near[2]
        return xs / ws, ys / ws


def motion_blur(img, k, horizontal=True):
    import cv2
    k = int(k)
    if k < 3:
        return img
    ker = np.zeros((k, k), np.float32)
    if horizontal:
        ker[k // 2, :] = 1.0 / k
    else:
        ker[:, k // 2] = 1.0 / k
    return cv2.filter2D(img, -1, ker)


def zoom_blur(img, strength):
    import cv2
    if strength <= 0.005:
        return img
    h, w = img.shape[:2]
    acc = img.astype(np.float32)
    n = 6
    for i in range(1, n):
        z = 1 + strength * i / n
        M = cv2.getRotationMatrix2D((w / 2, h / 2), 0, z)
        acc += cv2.warpAffine(img, M, (w, h), borderMode=cv2.BORDER_REFLECT)
    return (acc / n).astype(np.uint8)


def glitch(img, amt, rng):
    out = img.copy()
    sh = int(amt * 28)
    if sh:
        out[:, :, 2] = np.roll(img[:, :, 2], sh, axis=1)
        out[:, :, 0] = np.roll(img[:, :, 0], -sh, axis=1)
    h = img.shape[0]
    for _ in range(int(amt * 7)):
        y = rng.randint(0, h - 40)
        hh = rng.randint(10, 90)
        out[y:y + hh] = np.roll(out[y:y + hh], rng.randint(-60, 60), axis=1)
    return out


def emoji_image(ch, size):
    from PIL import Image, ImageDraw, ImageFont
    f = ImageFont.truetype("/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf", 109)
    im = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((80, 80), ch, font=f, embedded_color=True, anchor="mm")
    bb = im.getbbox() or (0, 0, 160, 160)
    im = im.crop(bb).resize((size, int(size * (bb[3] - bb[1]) / max(1, bb[2] - bb[0]))), Image.LANCZOS)
    return np.array(im)  # RGBA


def overlay_rgba(dst, rgba, cx, cy, scale=1.0, rot=0.0):
    import cv2
    if scale <= 0.02:
        return
    h, w = rgba.shape[:2]
    M = cv2.getRotationMatrix2D((w / 2, h / 2), rot, scale)
    M[0, 2] += cx - w / 2
    M[1, 2] += cy - h / 2
    H, W = dst.shape[:2]
    warped = cv2.warpAffine(rgba, M, (W, H), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))
    al = warped[:, :, 3:4].astype(np.float32) / 255.0
    rgb = warped[:, :, 2::-1].astype(np.float32)  # RGBA -> BGR
    dst[:] = (dst.astype(np.float32) * (1 - al) + rgb * al).astype(np.uint8)


def render_frames(plan, tl, info, faces, pipe):
    import cv2
    W, H, fps = plan["output"]["w"], plan["output"]["h"], plan["output"]["fps"]
    src = plan["source"]
    rng = random.Random(7)
    sw, sh = info["w"], info["h"]
    mode = plan.get("reframe", "auto")
    if mode == "auto":
        mode = "track" if (sh / sw) < (H / W) * 0.98 and faces else ("center" if sh / sw >= 1.2 else "blurfill")
        if (sh / sw) >= (H / W) * 0.98:
            mode = "center"
    print(f"[render] reframe mode: {mode}")
    # working (cover) size: the frame is scaled to cover the output, then zoomed by affine warp
    if mode == "blurfill":
        cw, ch = W, int(round(W * sh / sw / 2) * 2)  # fit width
    else:
        sc = max(W / sw, H / sh)
        cw, ch = int(round(sw * sc / 2) * 2), int(round(sh * sc / 2) * 2)
    tracker = Tracker(faces)
    punches = plan.get("zoom_punches", [])
    stickers = []
    for st in plan.get("stickers", []):
        img = emoji_image(st["emoji"], int(st.get("size", 170))) if st.get("emoji") else None
        if st.get("image"):
            from PIL import Image
            im = Image.open(st["image"]).convert("RGBA")
            s = int(st.get("size", 300))
            im = im.resize((s, int(s * im.height / im.width)))
            img = np.array(im)
        if img is not None:
            stickers.append((st, img))
    pb = plan.get("progress_bar", {})
    total = tl[-1]["t0"] + tl[-1]["odur"]
    smooth_cx = None
    for si, seg in enumerate(tl):
        nxt = tl[si + 1] if si + 1 < len(tl) else None
        tin = seg.get("transition_in", "cut")
        tout = nxt.get("transition_in", "cut") if nxt else "cut"
        frames = read_frames(src, seg["in"], (seg["out"] - seg["in"]) + 0.2, cw, ch, fps, seg["speed"])
        last = None
        for k in range(seg["nf"]):
            f = next(frames, None)
            if f is None:
                f = last
            last = f
            t_out = seg["t0"] + k / fps
            t_src = seg["in"] + (k / fps) * seg["speed"]
            p = k / max(1, seg["nf"] - 1)
            z = seg.get("zoom_from", 1.0) + (seg.get("zoom_to", 1.0) - seg.get("zoom_from", 1.0)) * ease_in_out(p)
            for pu in punches:  # emphasis punch-ins in output time
                d = t_out - pu["t"]
                dur = pu.get("dur", 0.4)
                if 0 <= d < dur:
                    z *= 1 + (pu.get("amount", 1.12) - 1) * (1 - ease_out(d / dur) * 0.15)
            dx = dy = 0.0
            blur_k, blur_h, zb, gl, flash = 0, True, 0.0, 0.0, 0.0
            # --- incoming transition (first frames of this segment)
            if k < 7 and si > 0:
                q = k / 6.0
                if tin == "punch":
                    z *= 1 + 0.12 * (1 - ease_out(q))
                elif tin.startswith("whip"):
                    v = (1 - ease_out(q))
                    if tin == "whip_left": dx = W * 0.45 * v
                    elif tin == "whip_right": dx = -W * 0.45 * v
                    elif tin == "whip_up": dy = H * 0.35 * v; blur_h = False
                    elif tin == "whip_down": dy = -H * 0.35 * v; blur_h = False
                    blur_k = 90 * v
                elif tin == "flash":
                    flash = max(0.0, 0.85 * (1 - q * 1.6))
                elif tin == "zoom_blur":
                    zb = 0.25 * (1 - ease_out(q)); z *= 1 + 0.1 * (1 - ease_out(q))
                elif tin == "glitch" and k < 5:
                    gl = 1 - k / 5
            # --- outgoing half of whip / zoom_blur (last frames of this segment)
            rem = seg["nf"] - 1 - k
            if nxt and rem < 4:
                q = 1 - rem / 4.0
                if tout == "whip_left": dx = -W * 0.45 * ease_in_out(q); blur_k = 90 * q
                elif tout == "whip_right": dx = W * 0.45 * ease_in_out(q); blur_k = 90 * q
                elif tout == "whip_up": dy = -H * 0.35 * ease_in_out(q); blur_k = 90 * q; blur_h = False
                elif tout == "whip_down": dy = H * 0.35 * ease_in_out(q); blur_k = 90 * q; blur_h = False
                elif tout == "zoom_blur": zb = 0.25 * q; z *= 1 + 0.12 * q
            if seg.get("shake"):
                a_ = seg["shake"]
                dx += math.sin(t_out * 23) * 6 * a_ + math.sin(t_out * 41) * 3 * a_
                dy += math.cos(t_out * 19) * 6 * a_
            # --- reframe: where is the subject?
            if mode == "blurfill":
                frame = compose_blurfill(f, W, H)
                cx_px, cy_px = W / 2, H / 2
                base = frame
                bw, bh = W, H
            else:
                base, bw, bh = f, cw, ch
                if mode == "track":
                    fx, _ = tracker.at(t_src)
                    target = seg.get("crop_x", fx)
                else:
                    target = seg.get("crop_x", 0.5)
                # critically damped smoothing across the whole edit (no snap at hard cuts but quick)
                smooth_cx = target if smooth_cx is None or k == 0 else smooth_cx + (target - smooth_cx) * 0.12
                cx_px = smooth_cx * bw
                cy_px = bh * seg.get("crop_y", 0.5)
            # clamp so we never show outside the frame
            half_w, half_h = W / (2 * z), H / (2 * z)
            if mode != "blurfill":
                cx_px = min(max(cx_px, half_w), bw - half_w)
                cy_px = min(max(cy_px, half_h), bh - half_h)
            M = np.array([[z, 0, W / 2 - z * cx_px + dx], [0, z, H / 2 - z * cy_px + dy]], np.float32)
            out = cv2.warpAffine(base, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
            if blur_k >= 3: out = motion_blur(out, blur_k, blur_h)
            if zb > 0: out = zoom_blur(out, zb)
            if gl > 0: out = glitch(out, gl, rng)
            if flash > 0: out = cv2.addWeighted(out, 1 - flash, np.full_like(out, 255), flash, 0)
            # --- stickers
            for st, img in stickers:
                d = t_out - st["start"]
                if 0 <= d <= st["end"] - st["start"]:
                    pop = 0.25
                    sc = (1.18 * ease_out(d / pop)) if d < pop else (1.18 - 0.18 * ease_out((d - pop) / 0.12) if d < pop + 0.12 else 1.0)
                    remain = st["end"] - st["start"] - d
                    if remain < 0.15: sc *= remain / 0.15
                    bob = math.sin(d * 5) * 8
                    overlay_rgba(out, img, st.get("x", 0.8) * W, st.get("y", 0.3) * H + bob, sc, math.sin(d * 3) * 6)
            # --- progress bar
            if pb.get("enabled"):
                y = int(pb.get("y", 0.0) * H)
                hh = int(pb.get("height", 9))
                cv2.rectangle(out, (0, y), (W, y + hh), (40, 40, 40), -1)
                cv2.rectangle(out, (0, y), (int(W * t_out / total), y + hh), hex_to_bgr(pb.get("color", "#FFE600")), -1)
            pipe.write(out.tobytes())
        frames.close()
        print(f"[render] segment {si + 1}/{len(tl)} ({tin})", flush=True)


def compose_blurfill(f, W, H):
    import cv2
    fh, fw = f.shape[:2]
    sc = max(W / fw, H / fh)
    bg = cv2.resize(f, (int(fw * sc) + 2, int(fh * sc) + 2))
    y0, x0 = (bg.shape[0] - H) // 2, (bg.shape[1] - W) // 2
    bg = bg[y0:y0 + H, x0:x0 + W]
    bg = cv2.GaussianBlur(cv2.resize(bg, (W // 8, H // 8)), (0, 0), 3)
    bg = cv2.resize(bg, (W, H))
    bg = (bg * 0.55).astype(np.uint8)
    y = (H - fh) // 2
    bg[max(0, y):y + fh] = f[max(0, -y):max(0, -y) + min(fh, H)]
    return bg


# --------------------------------------------------------------------------- render: captions & titles (ASS)
CAPTION_PRESETS = {
    # 2026 staples. colours in hex, size in px at 1080x1920
    "bold_pop":    {"font": "Cairo", "bold": 1, "size": 92, "color": "#FFFFFF", "outline": "#000000", "ow": 7, "shadow": 4, "hl": "#FFE600", "pop": True,  "upper": True},
    "neon_glow":   {"font": "Cairo", "bold": 1, "size": 90, "color": "#FFFFFF", "outline": "#00E5FF", "ow": 5, "shadow": 0, "hl": "#00E5FF", "pop": True, "glow": True},
    "clean_minimal": {"font": "Montserrat", "bold": 1, "size": 64, "color": "#FFFFFF", "outline": "#000000", "ow": 2, "shadow": 2, "hl": None, "pop": False, "words": 5},
    "karaoke_fill": {"font": "Cairo", "bold": 1, "size": 88, "color": "#7A7A7A", "outline": "#000000", "ow": 6, "shadow": 3, "hl": "#FFFFFF", "pop": False, "karaoke": True},
    "boxed":       {"font": "Cairo", "bold": 1, "size": 84, "color": "#000000", "outline": "#FFFFFF", "ow": 14, "shadow": 0, "hl": "#E1306C", "pop": True, "box": True},
    "hormozi":     {"font": "Anton", "bold": 0, "size": 112, "color": "#FFFFFF", "outline": "#000000", "ow": 8, "shadow": 5, "hl": "#2BFF5E", "pop": True, "upper": True, "words": 2},
}

TEXT_PRESETS = {
    "hook":  {"font": "Cairo", "size": 96, "color": "#000000", "box": "#FFE600", "bold": 1},
    "label": {"font": "Cairo", "size": 60, "color": "#FFFFFF", "box": "#000000", "box_alpha": 0x50, "bold": 1},
    "cta":   {"font": "Cairo", "size": 74, "color": "#FFFFFF", "box": "#E1306C", "bold": 1},
    "big":   {"font": "Anton", "size": 170, "color": "#FFFFFF", "outline": "#000000", "bold": 0},
    "number": {"font": "Anton", "size": 260, "color": "#FFE600", "outline": "#000000", "bold": 0},
}


def ass_time(t):
    t = max(0, t)
    h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"


def ass_escape(s):
    return s.replace("\\", "\\\\").replace("{", "(").replace("}", ")").replace("\n", "\\N")


def group_words(words, maxw, maxchars=20):
    groups, cur = [], []
    for i, w in enumerate(words):
        if cur:
            gap = w["s"] - cur[-1]["e"]
            chars = sum(len(x["w"]) + 1 for x in cur) + len(w["w"])
            end_punct = re.search(r"[.!?؟،,:]$", cur[-1]["w"])
            if len(cur) >= maxw or gap > 0.35 or chars > maxchars or end_punct or w.get("seg") != cur[-1].get("seg") and gap > 0.15:
                groups.append(cur); cur = []
        cur.append(w)
    if cur:
        groups.append(cur)
    return groups


def build_ass(plan, words, total, path):
    W, H = plan["output"]["w"], plan["output"]["h"]
    cap = plan.get("captions", {})
    pre = dict(CAPTION_PRESETS.get(cap.get("preset", "bold_pop"), CAPTION_PRESETS["bold_pop"]))
    for k in ("font", "size", "color", "outline"):
        if cap.get(k): pre[k] = cap[k]
    if "highlight" in cap: pre["hl"] = cap["highlight"]
    maxw = cap.get("max_words", pre.get("words", 3))
    y = int(cap.get("y", 0.66) * H)
    lines = ["[Script Info]", "ScriptType: v4.00+", f"PlayResX: {W}", f"PlayResY: {H}", "WrapStyle: 0",
             "ScaledBorderAndShadow: yes", "", "[V4+ Styles]",
             "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding"]
    bs = 3 if pre.get("box") else 1
    lines.append(f"Style: Cap,{pre['font']},{pre['size']},{hex_to_ass(pre['color'])},{hex_to_ass(pre.get('hl') or pre['color'])},"
                 f"{hex_to_ass(pre['outline'])},{hex_to_ass('#000000', 0x60)},{pre.get('bold', 1) and -1 or 0},0,0,0,100,100,0,0,{bs},{pre['ow']},{pre['shadow']},5,60,60,0,-1")
    for name, tp in TEXT_PRESETS.items():
        box = tp.get("box")
        lines.append(f"Style: T_{name},{tp['font']},{tp['size']},{hex_to_ass(tp['color'])},{hex_to_ass(tp['color'])},"
                     f"{hex_to_ass(box or tp.get('outline', '#000000'), tp.get('box_alpha', 0) if box else 0)},{hex_to_ass('#000000', 0x80)},"
                     f"{tp.get('bold', 1) and -1 or 0},0,0,0,100,100,0,0,{3 if box else 1},{18 if box else 9},{0 if box else 5},5,60,60,0,-1")
    lines += ["", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]

    if cap.get("enabled") and words:
        hl = pre.get("hl")
        for g in group_words(words, maxw):
            g_start = g[0]["s"]
            g_end = g[-1]["e"] + 0.12
            arabic = has_arabic(" ".join(x["w"] for x in g))
            def fmt(w):
                t = w["w"]
                return ass_escape(t.upper() if pre.get("upper") and not arabic else t)
            pos = f"\\an5\\pos({W // 2},{y})"
            glow = "\\blur6" if pre.get("glow") else ""
            if pre.get("karaoke"):
                parts = "".join(f"{{\\kf{max(1, int((x['e'] - x['s']) * 100))}}}{fmt(x)} " for x in g)
                lines.append(f"Dialogue: 0,{ass_time(g_start)},{ass_time(g_end)},Cap,,0,0,0,,{{{pos}{glow}\\fad(60,60)}}{parts.strip()}")
                continue
            # one event per active word: whole group visible, active word highlighted + popped
            for i, w in enumerate(g):
                s = w["s"] if i else g_start
                e = g[i + 1]["s"] if i + 1 < len(g) else g_end
                if e <= s: e = s + 0.05
                txt = []
                for j, x in enumerate(g):
                    if j == i and hl:
                        emph = x.get("emph")
                        sc = 118 if emph else 108
                        col = hex_to_ass(cap.get("emph_color", "#FF3B3B") if emph else hl)
                        anim = f"\\fscx{sc - 14}\\fscy{sc - 14}\\t(0,90,\\fscx{sc}\\fscy{sc})" if pre.get("pop") else ""
                        txt.append(f"{{\\1c{col}{anim}}}{fmt(x)}{{\\r}}")
                    else:
                        txt.append(fmt(x))
                intro = "\\fscx70\\fscy70\\t(0,110,\\fscx100\\fscy100)" if (i == 0 and pre.get("pop")) else ""
                lines.append(f"Dialogue: 0,{ass_time(s)},{ass_time(e)},Cap,,0,0,0,,{{{pos}{glow}{intro}}}{' '.join(txt)}")

    for tx in plan.get("texts", []):
        name = tx.get("preset", "hook")
        tp = TEXT_PRESETS.get(name, TEXT_PRESETS["hook"])
        ty = int(tx.get("y", 0.2) * H)
        tx_x = int(tx.get("x", 0.5) * W)
        s, e = tx["start"], tx["end"]
        anim = tx.get("anim", "pop")
        if anim == "pop":
            a = f"\\fscx40\\fscy40\\t(0,140,\\fscx108\\fscy108)\\t(140,220,\\fscx100\\fscy100)\\fad(0,120)"
        elif anim == "slide":
            a = f"\\move({tx_x - 700},{ty},{tx_x},{ty},0,220)\\fad(0,120)"
        elif anim == "drop":
            a = f"\\move({tx_x},{ty - 260},{tx_x},{ty},0,200)\\fad(80,120)"
        elif anim == "typewriter":
            a = "\\fad(0,120)"
        else:
            a = "\\fad(120,120)"
        rot = f"\\frz{tx['rotate']}" if tx.get("rotate") else ""
        pos = "" if anim in ("slide", "drop") else f"\\pos({tx_x},{ty})"
        text = ass_escape(tx["text"])
        if anim == "typewriter":
            chars = list(tx["text"])
            step = min(0.06, 0.6 / max(1, len(chars)))
            for i in range(1, len(chars) + 1):
                st = s + (i - 1) * step
                en = s + i * step if i < len(chars) else e
                lines.append(f"Dialogue: 1,{ass_time(st)},{ass_time(en)},T_{name},,0,0,0,,{{\\an5{pos}{rot}}}{ass_escape(''.join(chars[:i]))}")
        else:
            lines.append(f"Dialogue: 1,{ass_time(s)},{ass_time(e)},T_{name},,0,0,0,,{{\\an5{pos}{rot}{a}}}{text}")
    Path(path).write_text("\n".join(lines) + "\n", encoding="utf-8")


# --------------------------------------------------------------------------- render: sound design
def synth_sfx(kind, sr=48000):
    rng = np.random.default_rng(3)
    if kind == "whoosh":
        d = 0.45; n = int(sr * d); t = np.arange(n) / sr
        noise = rng.standard_normal(n)
        # sweeping band-pass via FFT-free approach: moving one-pole filters
        out = np.zeros(n); lp = 0.0; hp_prev = 0.0; prev = 0.0
        for i in range(n):
            fc = 300 + 5000 * math.sin(math.pi * t[i] / d) ** 2
            a = math.exp(-2 * math.pi * fc / sr)
            lp = (1 - a) * noise[i] + a * lp
            hp = 0.97 * (hp_prev + lp - prev); hp_prev = hp; prev = lp
            out[i] = hp
        env = np.sin(np.pi * t / d) ** 2
        y = out * env
    elif kind == "pop":
        d = 0.12; t = np.arange(int(sr * d)) / sr
        f = 900 * np.exp(-t * 30) + 250
        y = np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-t * 40)
    elif kind == "impact":
        d = 0.6; t = np.arange(int(sr * d)) / sr
        y = np.sin(2 * np.pi * (55 + 60 * np.exp(-t * 18)) * t) * np.exp(-t * 6)
        y += 0.35 * rng.standard_normal(len(t)) * np.exp(-t * 35)
    elif kind == "flash":
        d = 0.35; t = np.arange(int(sr * d)) / sr
        y = rng.standard_normal(len(t)) * np.exp(-t * 14)
        y = np.convolve(y, np.ones(4) / 4, "same")
    elif kind == "glitch":
        d = 0.22; t = np.arange(int(sr * d)) / sr
        y = np.sign(np.sin(2 * np.pi * 180 * t)) * (rng.random(len(t)) > 0.5) * np.exp(-t * 12) * 0.6
    elif kind == "riser":
        d = 1.2; t = np.arange(int(sr * d)) / sr
        y = rng.standard_normal(len(t)) * (t / d) ** 2 + 0.3 * np.sin(2 * np.pi * (200 + 900 * (t / d) ** 2) * t) * (t / d)
    elif kind == "tick":
        d = 0.05; t = np.arange(int(sr * d)) / sr
        y = np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 120)
    else:
        return None
    y = y / (np.max(np.abs(y)) + 1e-9) * 0.9
    return y.astype(np.float32)


def write_wav(path, y, sr=48000):
    import wave
    y16 = (np.clip(y, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(y16.tobytes())


def build_audio(plan, tl, info, total, tmp):
    au = plan.get("audio", {})
    out = tmp / "final_audio.wav"
    if not info["has_audio"]:
        run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", f"{total:.3f}", str(out)])
        return out
    parts, fc = [], []
    for i, s in enumerate(tl):
        sp = s["speed"]
        tempo = ""
        x = sp
        while x > 2.0: tempo += "atempo=2.0,"; x /= 2.0
        while x < 0.5: tempo += "atempo=0.5,"; x /= 0.5
        if abs(x - 1) > 1e-3: tempo += f"atempo={x:.4f},"
        fc.append(f"[0:a]atrim={s['in']:.3f}:{s['out']:.3f},asetpts=PTS-STARTPTS,aresample=48000,{tempo}"
                  f"apad,atrim=0:{s['odur']:.4f},afade=t=in:d=0.012,afade=t=out:st={max(0, s['odur'] - 0.015):.4f}:d=0.015[a{i}]")
        parts.append(f"[a{i}]")
    fc.append(f"{''.join(parts)}concat=n={len(parts)}:v=0:a=1[voice0]")
    chain = "aformat=channel_layouts=stereo"
    if au.get("cleanup", True):
        chain = ("highpass=f=85,lowpass=f=15000,afftdn=nf=-28,"
                 "equalizer=f=250:t=q:w=1.2:g=-2,equalizer=f=3200:t=q:w=1.0:g=2.5,equalizer=f=9000:t=q:w=1:g=1.5,"
                 "acompressor=threshold=-20dB:ratio=3.2:attack=6:release=90:makeup=2.5,"
                 "alimiter=limit=0.89,aformat=channel_layouts=stereo")
    fc.append(f"[voice0]{chain}[voice]")
    inputs = ["-i", plan["source"]]
    mix = ["[voice]"]
    idx = 1
    # SFX on transitions + stickers + text pops
    if au.get("sfx", True):
        vol = au.get("sfx_volume", 0.5)
        events = []
        kind_for = {"whip_left": "whoosh", "whip_right": "whoosh", "whip_up": "whoosh", "whip_down": "whoosh",
                    "flash": "flash", "glitch": "glitch", "zoom_blur": "whoosh", "punch": "pop"}
        for s in tl[1:]:
            k = kind_for.get(s.get("transition_in", "cut"))
            if k:
                lead = 0.2 if k == "whoosh" else 0.0
                events.append((k, max(0, s["t0"] - lead), vol * (0.55 if k == "pop" else 1.0)))
        for st in plan.get("stickers", []):
            events.append(("pop", st["start"], vol * 0.8))
        for tx in plan.get("texts", []):
            events.append(("impact" if tx.get("preset") in ("big", "number", "hook") else "tick", tx["start"], vol * 0.7))
        for pu in plan.get("zoom_punches", []):
            events.append(("impact", pu["t"], vol * 0.6))
        events += [(e["type"], e["t"], e.get("volume", vol)) for e in au.get("sfx_events", [])]
        cache = {}
        for k, t, v in events:
            if k not in cache:
                y = synth_sfx(k)
                if y is None: continue
                p = tmp / f"sfx_{k}.wav"; write_wav(p, y); cache[k] = p
            inputs += ["-i", str(cache[k])]
            ms = int(t * 1000)
            fc.append(f"[{idx}:a]aformat=channel_layouts=stereo,volume={v:.2f},adelay={ms}|{ms}[s{idx}]")
            mix.append(f"[s{idx}]"); idx += 1
    voice_mix = f"{''.join(mix)}amix=inputs={len(mix)}:normalize=0:dropout_transition=0[vx]" if len(mix) > 1 else "[voice]anull[vx]"
    fc.append(voice_mix)
    last = "[vx]"
    if au.get("music"):
        inputs += ["-stream_loop", "-1", "-i", au["music"]]
        mv = au.get("music_volume", 0.12)
        fc.append(f"[{idx}:a]aformat=channel_layouts=stereo,aresample=48000,volume={mv},atrim=0:{total:.3f},"
                  f"afade=t=in:d=0.4,afade=t=out:st={max(0, total - 1.2):.3f}:d=1.2[mus]")
        fc.append(f"[vx]asplit=2[vx1][vxsc]")
        fc.append(f"[mus][vxsc]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=350[duck]")
        fc.append(f"[vx1][duck]amix=inputs=2:normalize=0[mx]")
        last = "[mx]"
    lufs = au.get("loudness", -14)
    fc.append(f"{last}loudnorm=I={lufs}:TP=-1.5:LRA=9,atrim=0:{total:.3f},aresample=48000[out]")
    run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(fc), "-map", "[out]",
         "-ac", "2", "-ar", "48000", str(out)])
    return out


# --------------------------------------------------------------------------- render: color
GRADES = {
    "none": "",
    "punchy": "eq=contrast=1.08:saturation=1.22:gamma=0.98,colorbalance=rs=-0.03:gs=0.0:bs=0.05:rh=0.04:gh=0.01:bh=-0.04",
    "cinematic": "curves=preset=medium_contrast,eq=saturation=1.08,colorbalance=rs=-0.07:bs=0.08:rm=0.02:bm=-0.02:rh=0.07:bh=-0.07",
    "clean_bright": "eq=brightness=0.035:contrast=1.04:saturation=1.10:gamma=1.04,colorbalance=rh=0.015:bh=-0.01",
    "warm_film": "colortemperature=temperature=5200:mix=0.6,curves=r='0/0.03 0.5/0.52 1/0.97':g='0/0.02 0.5/0.5 1/0.96':b='0/0.06 0.5/0.47 1/0.9',eq=saturation=0.95",
    "moody": "eq=contrast=1.14:saturation=0.82:brightness=-0.02,colorbalance=rs=-0.04:bs=0.06:rh=0.02:bh=0.02,curves=preset=darker",
    "bw_contrast": "hue=s=0,curves=preset=strong_contrast",
}


def grade_chain(g):
    parts = []
    base = GRADES.get(g.get("preset", "punchy"), GRADES["punchy"])
    if base: parts.append(base)
    if g.get("sharpen", True): parts.append("unsharp=5:5:0.55:5:5:0.0")
    if g.get("vignette", True): parts.append("vignette=angle=PI/5.5")
    if g.get("grain", 0): parts.append(f"noise=alls={int(g['grain'])}:allf=t")
    return parts


# --------------------------------------------------------------------------- render: main
def cmd_render(a):
    plan_path = Path(a.plan).resolve()
    plan = json.loads(plan_path.read_text())
    work = plan_path.parent
    if a.preview:
        plan["output"] = {**plan["output"], "w": 540, "h": 960, "crf": 26}
    W, H, fps = plan["output"]["w"], plan["output"]["h"], plan["output"]["fps"]
    info = ffprobe(plan["source"])
    an_p = work / "analysis.json"
    faces = json.loads(an_p.read_text()).get("faces") if an_p.exists() else None
    tl, total = build_timeline(plan)
    print(f"[render] {len(tl)} segments -> {total:.2f}s at {W}x{H}@{fps}")
    words = []
    if plan.get("words") and Path(plan["words"]).exists():
        words = remap_words(json.loads(Path(plan["words"]).read_text()), tl)
    tmp = work / "_tmp"; tmp.mkdir(exist_ok=True)
    # captions are authored at 1080x1920; libass scales them for previews
    ass_plan = {**plan, "output": {**plan["output"], "w": 1080, "h": 1920}}
    build_ass(ass_plan, words, total, tmp / "captions.ass")
    audio = build_audio(plan, tl, info, total, tmp)
    out = Path(a.out or (work / ("preview.mp4" if a.preview else "final.mp4"))).resolve()
    vf = grade_chain(plan.get("grade", {}))
    vf.append(f"subtitles=filename={tmp / 'captions.ass'}:fontsdir={FONTS}:original_size=1080x1920")
    vf.append("format=yuv420p")
    enc = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(fps),
           "-i", "-", "-i", str(audio), "-vf", ",".join(vf), "-map", "0:v", "-map", "1:a",
           "-c:v", "libx264", "-preset", "veryfast" if a.preview else "medium", "-crf", str(plan["output"].get("crf", 18)),
           "-profile:v", "high", "-level", "4.2", "-r", str(fps), "-g", str(fps * 2),
           "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart",
           "-metadata", "comment=edited with reelkit", str(out)]
    p = subprocess.Popen(enc, stdin=subprocess.PIPE)
    try:
        render_frames(plan, tl, info, faces, p.stdin)
    finally:
        p.stdin.close()
        p.wait()
    if p.returncode != 0:
        sys.exit("[render] encoder failed")
    print(f"[render] done -> {out}")


def cmd_qa(a):
    work = Path(a.work); work.mkdir(parents=True, exist_ok=True)
    info = ffprobe(a.video)
    ld = loudness(a.video)
    qa = work / "qa"; qa.mkdir(exist_ok=True)
    sheets = contact_sheets(Path(a.video), info, qa, every=a.every, cols=6, rows=3)
    rep = {"size": f"{info['w']}x{info['h']}", "fps": round(info["fps"], 2), "duration": round(info["duration"], 2),
           "loudness": ld, "sheets": sheets,
           "checks": {
               "vertical_9x16": abs(info["w"] / info["h"] - 9 / 16) < 0.01,
               "loudness_ok(-15..-13)": bool(ld and -15.5 <= ld["lufs"] <= -12.5),
               "true_peak_ok(<=-1)": bool(ld and ld["true_peak"] <= -0.9),
           }}
    print(json.dumps(rep, indent=1))
    (qa / "qa.json").write_text(json.dumps(rep, indent=1))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest="cmd", required=True)
    p = sp.add_parser("analyze"); p.add_argument("src"); p.add_argument("--work", required=True)
    p.add_argument("--noise-db", type=float, default=-35); p.add_argument("--min-silence", type=float, default=0.35)
    p.add_argument("--every", type=float, default=2.0); p.add_argument("--no-faces", action="store_true")
    p.set_defaults(fn=cmd_analyze)
    p = sp.add_parser("words"); p.add_argument("--work", required=True); p.add_argument("--from", dest="src", required=True)
    p.set_defaults(fn=cmd_words)
    p = sp.add_parser("autoplan"); p.add_argument("--work", required=True); p.add_argument("--target", type=float, default=30)
    p.set_defaults(fn=cmd_autoplan)
    p = sp.add_parser("render"); p.add_argument("plan"); p.add_argument("--out"); p.add_argument("--preview", action="store_true")
    p.set_defaults(fn=cmd_render)
    p = sp.add_parser("qa"); p.add_argument("video"); p.add_argument("--work", required=True); p.add_argument("--every", type=float, default=1.5)
    p.set_defaults(fn=cmd_qa)
    a = ap.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
