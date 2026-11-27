"""
Motion-graphics layer for the three reference reel styles (rendered per frame in Python, composited before encoding):

  full_screen  : checklist cards (dark glass card, items tick to coral checks when spoken), small badge cards
  split_screen : top-half graphic panels on paper/grid that change every ~1-2 s (headline, stat+bar chart,
                 yellow card with mono tags, photo card), speaker in the bottom half
  cinematic    : black & white film look, warm light leak, huge red condensed words BEHIND the person (person
                 segmentation with u2net_human_seg via onnxruntime)

All drawing is Pillow (with raqm, so Arabic shapes correctly) + numpy/OpenCV.
"""
import math
import os
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

FONTS = Path(__file__).resolve().parent.parent / "assets" / "fonts"
CORAL = (232, 96, 60)
PAPER = (242, 239, 233)
INK = (16, 16, 16)
RED = (214, 22, 32)
YELLOW = (255, 229, 0)


def has_ar(s):
    return any("؀" <= c <= "ۿ" for c in s or "")


@lru_cache(maxsize=64)
def font(name, size):
    return ImageFont.truetype(str(FONTS / name), int(size))


def F(kind, size, text=""):
    """Pick a font by role; Arabic text always gets Cairo (the Latin display faces have no Arabic glyphs)."""
    if has_ar(text):
        return font("Cairo-900.ttf" if kind in ("display", "bold") else "Cairo-800.ttf", size)
    return font({"display": "Anton-Regular.ttf", "bold": "Inter-Bold.ttf", "semi": "Inter-SemiBold.ttf",
                 "medium": "Inter-Medium.ttf", "mono": "SpaceMono-Bold.ttf", "serif": "InstrumentSerif-Italic.ttf"}[kind], size)


def ease_out(x):
    x = min(max(x, 0.0), 1.0)
    return 1 - (1 - x) ** 3


def ease_back(x):
    x = min(max(x, 0.0), 1.0)
    c1 = 1.70158
    c3 = c1 + 1
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2


def paste_rgba(dst_bgr, im, x, y, alpha=1.0):
    """Alpha-composite a PIL RGBA image onto a BGR numpy frame at (x, y) top-left."""
    if alpha <= 0.01:
        return
    a = np.asarray(im, dtype=np.float32)
    h, w = a.shape[:2]
    H, W = dst_bgr.shape[:2]
    x0, y0 = max(0, int(x)), max(0, int(y))
    x1, y1 = min(W, int(x) + w), min(H, int(y) + h)
    if x1 <= x0 or y1 <= y0:
        return
    sub = a[y0 - int(y): y1 - int(y), x0 - int(x): x1 - int(x)]
    al = sub[:, :, 3:4] / 255.0 * alpha
    rgb = sub[:, :, 2::-1]
    region = dst_bgr[y0:y1, x0:x1].astype(np.float32)
    dst_bgr[y0:y1, x0:x1] = (region * (1 - al) + rgb * al).astype(np.uint8)


# ----------------------------------------------------------------------------- checklist (full screen style)
def checklist_card(items, states, scale=1.0):
    """items: list of str; states: list of 0..1 check progress (0 = empty circle, 1 = full coral check)."""
    s = scale
    fs = int(34 * s)
    pad, gap, r = int(26 * s), int(16 * s), int(15 * s)
    fnts = [F("semi", fs, t) for t in items]
    widths = [ImageDraw.Draw(Image.new("RGB", (1, 1))).textlength(t, font=f) for t, f in zip(items, fnts)]
    w = int(pad * 2 + 2 * r + 18 * s + max(widths))
    lh = int(fs * 1.25)
    h = int(pad * 2 + len(items) * lh + (len(items) - 1) * (gap - 6 * s))
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, w - 1, h - 1], radius=int(22 * s), fill=(14, 14, 16, 205), outline=(255, 255, 255, 28), width=2)
    y = pad
    rtl = any(has_ar(t) for t in items)
    for t, f, st in zip(items, fnts, states):
        cx, cy = (w - pad - r if rtl else pad + r), y + lh // 2
        if st <= 0:
            d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(235, 235, 235, 255), width=max(2, int(2.5 * s)))
        else:
            rr = r * (0.6 + 0.4 * ease_back(st))
            d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=CORAL + (255,))
            if st > 0.35:
                k = min(1, (st - 0.35) / 0.4)
                p1, p2, p3 = (cx - r * 0.45, cy + r * 0.02), (cx - r * 0.1, cy + r * 0.35), (cx + r * 0.5, cy - r * 0.35)
                pts = [p1, p2] if k < 0.5 else [p1, p2, (p2[0] + (p3[0] - p2[0]) * (k - 0.5) * 2, p2[1] + (p3[1] - p2[1]) * (k - 0.5) * 2)]
                d.line(pts, fill=(255, 255, 255, 255), width=max(3, int(3.5 * s)), joint="curve")
        if rtl:
            d.text((w - pad - 2 * r - int(18 * s), cy), t, font=f, fill=(245, 245, 245, 255), anchor="rm", direction="rtl" if has_ar(t) else None)
        else:
            d.text((pad + 2 * r + int(18 * s), cy), t, font=f, fill=(245, 245, 245, 255), anchor="lm")
        y += lh + gap - int(6 * s)
    return im


def draw_checklist(frame, g, t):
    """g: {"items":[...], "checks":[t...], "start","end", "x","y" (centre, 0..1), "scale"}"""
    H, W = frame.shape[:2]
    d = t - g["start"]
    if d < 0 or t > g["end"]:
        return
    states = [min(1.0, max(0.0, (t - ct) / 0.25)) if ct is not None else 0 for ct in g.get("checks", [None] * len(g["items"]))]
    card = checklist_card(g["items"], states, g.get("scale", 1.0) * W / 1080)
    a_in = ease_out(d / 0.3)
    a_out = min(1.0, (g["end"] - t) / 0.25)
    y = g.get("y", 0.8) * H - card.height / 2 + (1 - a_in) * 30
    paste_rgba(frame, card, g.get("x", 0.5) * W - card.width / 2, y, min(a_in, a_out))


# ----------------------------------------------------------------------------- split-screen panels
def paper_bg(w, h, grid=True, color=PAPER):
    im = Image.new("RGBA", (w, h), color + (255,))
    if grid:
        d = ImageDraw.Draw(im)
        step = max(24, w // 18)
        for x in range(0, w, step):
            d.line([(x, 0), (x, h)], fill=(0, 0, 0, 14), width=1)
        for y in range(0, h, step):
            d.line([(0, y), (w, y)], fill=(0, 0, 0, 14), width=1)
    rng = np.random.default_rng(3)
    noise = (rng.standard_normal((h, w)) * 5).astype(np.int16)
    a = np.asarray(im).astype(np.int16)
    a[:, :, :3] = np.clip(a[:, :, :3] + noise[:, :, None], 0, 255)
    return Image.fromarray(a.astype(np.uint8), "RGBA")


def mono_tag(text, size, fg=(255, 255, 255), bg=INK):
    f = F("mono", size, text)
    d0 = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    w = int(d0.textlength(text, font=f)) + int(size * 0.9)
    h = int(size * 1.55)
    im = Image.new("RGBA", (w, h), bg + (255,))
    ImageDraw.Draw(im).text((w / 2, h / 2), text, font=f, fill=fg + (255,), anchor="mm")
    return im


def fit_text(text, kind, max_w, max_size, min_size=30):
    size = max_size
    d0 = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    while size > min_size and d0.textlength(text, font=F(kind, size, text)) > max_w:
        size -= 4
    return F(kind, size, text), size


def render_panel(card, w, h, p, src_frame=None):
    """card: dict with "type" in headline|stat|yellow|photo|quote. p = 0..1 entrance progress."""
    typ = card.get("type", "headline")
    bg = YELLOW if typ == "yellow" else PAPER
    im = paper_bg(w, h, grid=typ != "yellow", color=bg)
    d = ImageDraw.Draw(im)
    e = ease_out(p / 0.6) if p < 0.6 else 1.0
    lift = int((1 - e) * h * 0.06)
    if typ in ("headline", "yellow"):
        title = card["title"]
        f, size = fit_text(title, "display", w * 0.86, int(h * 0.26))
        ty = h * (0.42 if card.get("tags") else 0.5) + lift
        d.text((w / 2, ty), title, font=f, fill=INK + (int(255 * e),), anchor="mm")
        tags = card.get("tags", [])
        if tags:
            ims = [mono_tag(tg, int(h * 0.045)) for tg in tags]
            total = sum(i.width for i in ims) + (len(ims) - 1) * int(w * 0.03)
            x = (w - total) / 2
            for k, ti in enumerate(ims):
                pk = ease_back(min(1, max(0, (p - 0.25 - 0.1 * k) / 0.35)))
                if pk > 0:
                    t2 = ti.resize((max(1, int(ti.width * pk)), max(1, int(ti.height * pk))))
                    im.alpha_composite(t2, (int(x + (ti.width - t2.width) / 2), int(ty + size * 0.62 + (ti.height - t2.height) / 2)))
                x += ti.width + int(w * 0.03)
    elif typ == "stat":
        title = card.get("title", "")
        f, size = fit_text(title, "display", w * 0.8, int(h * 0.15))
        ar = has_ar(title)
        tx, anc = (w * 0.92, "rt") if ar else (w * 0.08, "lt")
        d.text((tx, h * 0.1 + lift), title, font=f, fill=INK + (255,), anchor=anc)
        num = card.get("value", "")
        fn = F("bold", int(h * 0.12), num)
        d.text((tx, h * 0.1 + size * 1.2 + lift), num, font=fn, fill=RED + (255,), anchor=anc)
        bars = card.get("bars", [0.25, 0.4, 0.35, 0.55, 0.5, 0.95])
        bw = w * 0.62 / (len(bars) * 1.45)
        base = h * 0.9
        for i, b in enumerate(bars):
            gk = ease_out(min(1, max(0, (p - 0.15 - i * 0.06) / 0.4)))
            bh = b * h * 0.5 * gk
            x0 = (w * 0.08 if ar else w * 0.3) + i * bw * 1.45
            col = RED if i == len(bars) - 1 else INK
            d.rectangle([x0, base - bh, x0 + bw, base], fill=col + (255,))
        d.line([(w * 0.08, base), (w * 0.92, base)], fill=INK + (255,), width=3)
        if card.get("label"):
            lt = mono_tag(card["label"], int(h * 0.04))
            lx = int(w * 0.08) if ar else int(w * 0.92 - lt.width)
            im.alpha_composite(lt, (lx, int(h * 0.1)))
    elif typ == "photo" and src_frame is not None:
        ph = Image.fromarray(src_frame[:, :, ::-1]).convert("RGBA")
        pw = int(w * 0.62)
        phh = int(pw * ph.height / ph.width)
        if phh > h * 0.78:
            phh = int(h * 0.78); pw = int(phh * ph.width / ph.height)
        ph = ph.resize((pw, phh))
        mask = Image.new("L", ph.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, pw - 1, phh - 1], radius=int(w * 0.03), fill=255)
        ph.putalpha(mask)
        sh = Image.new("RGBA", (pw + 60, phh + 60), (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle([30, 36, pw + 30, phh + 36], radius=int(w * 0.03), fill=(0, 0, 0, 90))
        sh = sh.filter(ImageFilter.GaussianBlur(14))
        x, y = (w - pw) // 2, int((h - phh) // 2 + lift)
        rot = (1 - e) * 4 + card.get("tilt", -2)
        layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
        layer.alpha_composite(sh, (x - 30, y - 30))
        layer.alpha_composite(ph, (x, y))
        layer = layer.rotate(rot, resample=Image.BICUBIC, center=(w / 2, h / 2))
        im.alpha_composite(layer)
        if card.get("label"):
            lt = mono_tag(card["label"], int(h * 0.04))
            im.alpha_composite(lt, (int(w / 2 - lt.width / 2), int(y + phh - lt.height / 2)))
    elif typ == "quote":
        txt = card["title"]
        f, size = fit_text(txt, "serif" if not has_ar(txt) else "bold", w * 0.84, int(h * 0.16))
        d.text((w / 2, h / 2 + lift), txt, font=f, fill=INK + (int(255 * e),), anchor="mm")
    if p < 1:
        im.putalpha(Image.eval(im.getchannel("A"), lambda a: int(a * min(1.0, p / 0.15 + 0.2))))
    return im


# ----------------------------------------------------------------------------- person segmentation (behind-text)
class Segmenter:
    def __init__(self):
        import onnxruntime as ort
        p = Path(os.path.expanduser("~/.cache/reelkit/u2net_human_seg.onnx"))
        if not p.exists():
            raise SystemExit("missing model: download u2net_human_seg.onnx to ~/.cache/reelkit/ "
                             "(https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net_human_seg.onnx)")
        so = ort.SessionOptions()
        so.intra_op_num_threads = os.cpu_count() or 4
        self.s = ort.InferenceSession(str(p), so, providers=["CPUExecutionProvider"])
        self.inp = self.s.get_inputs()[0].name
        self.prev = None

    def mask(self, bgr):
        import cv2
        H, W = bgr.shape[:2]
        x = cv2.resize(bgr[:, :, ::-1], (320, 320)).astype(np.float32) / 255.0
        x = (x - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]
        x = x.transpose(2, 0, 1)[None].astype(np.float32)
        m = self.s.run(None, {self.inp: x})[0][0, 0]
        m = (m - m.min()) / (m.max() - m.min() + 1e-6)
        m = cv2.resize(m, (W, H))
        m = np.clip((m - 0.35) / 0.3, 0, 1)
        m = cv2.GaussianBlur(m, (0, 0), 2)
        if self.prev is not None and self.prev.shape == m.shape:   # temporal smoothing
            m = 0.6 * m + 0.4 * self.prev
        self.prev = m
        return m.astype(np.float32)


def big_word_layer(text, W, H, color=RED, stretch=1.65, y=0.3, p=1.0):
    """Huge condensed word, vertically stretched (reference: red text behind the head)."""
    f, size = fit_text(text, "display", W * 0.94, int(H * 0.2), 40)
    d0 = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    bb = d0.textbbox((0, 0), text, font=f, anchor="lt")
    tw, th = bb[2] - bb[0] + 20, bb[3] - bb[1] + 20
    im = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((10 - bb[0], 10 - bb[1]), text, font=f, fill=color + (255,))
    sy = stretch * (0.85 + 0.15 * ease_out(p / 0.5))
    im = im.resize((tw, max(1, int(th * sy))), Image.BICUBIC)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    layer.alpha_composite(im, (int((W - im.width) / 2), int(y * H - im.height / 2)))
    return layer


# ----------------------------------------------------------------------------- cinematic look
def cinematic_look(frame, t, strength=1.0, leak=True):
    import cv2
    g = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY).astype(np.float32)
    g = np.clip((g - 128) * 1.18 + 122, 0, 255)               # contrast, slightly crushed
    out = np.repeat(g[:, :, None], 3, axis=2)
    if leak:
        H, W = g.shape
        cx = W * (0.25 + 0.08 * math.sin(t * 0.7))
        cy = H * (0.55 + 0.05 * math.cos(t * 0.5))
        yy, xx = np.ogrid[:H, :W]
        r = np.sqrt(((xx - cx) / (W * 0.55)) ** 2 + ((yy - cy) / (H * 0.4)) ** 2)
        k = np.clip(1 - r, 0, 1) ** 2 * 0.55 * strength
        warm = np.array([40, 110, 255], np.float32)          # BGR orange/red
        out = out * (1 - k[:, :, None] * 0.35) + warm * k[:, :, None] * (out / 255.0 + 0.25)
    return np.clip(out, 0, 255).astype(np.uint8)
