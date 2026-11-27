#!/usr/bin/env python3
"""Original, license-free backing beats synthesized with numpy (no samples).
usage: make_beat.py OUT.wav --style phonk|house|lux --bpm 120 --seconds 32 [--intro-beats 4]
The first --intro-beats beats are a filtered build-up with a riser; the drop lands right after.
"""
import argparse, wave
import numpy as np

SR = 44100
rng = np.random.default_rng(11)


def env(n, a, d):
    t = np.arange(n) / SR
    e = np.exp(-t / d)
    na = max(1, int(a * SR))
    e[:na] *= np.linspace(0, 1, na)
    return e


def kick(punch=1.0):
    n = int(0.45 * SR); t = np.arange(n) / SR
    f = 45 + 140 * np.exp(-t * 28) * punch
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
    y[:200] += rng.standard_normal(200) * 0.3 * np.linspace(1, 0, 200)
    return np.tanh(y * 2.2) * 0.9


def clap():
    n = int(0.3 * SR); t = np.arange(n) / SR
    y = rng.standard_normal(n)
    e = np.zeros(n)
    for o in (0, 0.012, 0.024):
        i = int(o * SR); e[i:] += np.exp(-(t[: n - i]) * 30)
    y = y * e
    y = np.convolve(y, [1, -0.9], "same")
    return y / np.abs(y).max() * 0.55


def hat(open_=False):
    n = int((0.25 if open_ else 0.05) * SR); t = np.arange(n) / SR
    y = rng.standard_normal(n)
    y = np.diff(np.concatenate([[0], y]))
    return y * np.exp(-t * (12 if open_ else 70)) * 0.22


def cowbell(freq):
    n = int(0.35 * SR); t = np.arange(n) / SR
    y = np.sign(np.sin(2 * np.pi * freq * t)) + np.sign(np.sin(2 * np.pi * freq * 1.48 * t))
    y = np.convolve(y, np.ones(6) / 6, "same")
    return y * np.exp(-t * 11) * 0.16


def bass808(freq, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    f = freq * (1 + 0.6 * np.exp(-t * 40))
    y = np.sin(2 * np.pi * np.cumsum(f) / SR)
    y = np.tanh(y * 3.0) * env(n, 0.005, dur * 0.9)
    return y * 0.5


def pad(freqs, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    y = sum(np.sin(2 * np.pi * f * t + np.sin(2 * np.pi * 0.3 * t)) + 0.3 * np.sin(2 * np.pi * 2 * f * t) for f in freqs)
    a = np.minimum(1, t / 0.4) * np.minimum(1, (dur - t) / 0.4)
    return y * a * 0.05


def riser(dur):
    n = int(dur * SR); t = np.arange(n) / SR
    y = rng.standard_normal(n) * (t / dur) ** 2 * 0.35
    y += 0.15 * np.sin(2 * np.pi * (150 + 1200 * (t / dur) ** 2) * t) * (t / dur)
    return y


def place(buf, s, t):
    i = int(t * SR)
    if i >= len(buf): return
    j = min(len(buf), i + len(s))
    buf[i:j] += s[: j - i]


def note(n):  # midi -> Hz
    return 440 * 2 ** ((n - 69) / 12)


def build(style, bpm, seconds, intro):
    b = 60 / bpm
    N = int(seconds * SR)
    drums = np.zeros(N); bass = np.zeros(N); mel = np.zeros(N)
    t0 = intro * b
    if intro:
        place(mel, riser(t0), 0)
        for k in range(intro):
            place(drums, hat() * (k + 1) / intro, k * b)
    prog = [45, 45, 41, 43]  # A, A, F, G (minor feel)
    beat = 0
    while t0 + beat * b < seconds:
        t = t0 + beat * b
        bar, pos = divmod(beat, 4)
        root = prog[bar % 4]
        if style == "phonk":
            if pos in (0, 2): place(drums, kick(), t)
            if pos == 2: place(drums, clap(), t)
            if pos == 3 and bar % 2: place(drums, kick(0.7), t + b / 2)
            for s in range(4):
                if not (bar % 4 == 3 and pos == 3) or s % 2 == 0:
                    place(drums, hat(), t + s * b / 4)
            if bar % 4 == 3 and pos == 3:
                for s in range(6): place(drums, hat() * 0.8, t + s * b / 6)
            if pos == 0: place(bass, bass808(note(root - 12), 4 * b * 0.95), t)
            mel_pat = [0, 3, 7, 10, 7, 3, 0, 12]
            for s in range(2):
                place(mel, cowbell(note(root + 24 + mel_pat[(pos * 2 + s) % 8])), t + s * b / 2)
        elif style == "house":
            place(drums, kick(0.8), t)
            if pos in (1, 3): place(drums, clap() * 0.7, t)
            place(drums, hat(True) * 0.6, t + b / 2)
            if pos == 0: place(mel, pad([note(root + 24), note(root + 27), note(root + 31)], 4 * b), t)
            place(bass, bass808(note(root - 12), b * 0.45) * 0.7, t + b / 2)
        else:  # lux: slow, elegant
            if pos == 0: place(drums, kick(0.6) * 0.8, t)
            if pos == 2: place(drums, clap() * 0.35, t)
            if pos in (1, 3): place(drums, hat() * 0.5, t)
            if pos == 0: place(mel, pad([note(root + 24), note(root + 28), note(root + 31), note(root + 35)], 4 * b), t)
            if pos == 0: place(bass, bass808(note(root - 12), 2 * b) * 0.6, t)
        beat += 1
    # sidechain pump on bass + melody from the kick grid
    pump = np.ones(N)
    k = 0
    while t0 + k * b < seconds:
        i = int((t0 + k * b) * SR); n = int(b * SR * 0.6)
        j = min(N, i + n)
        pump[i:j] = np.minimum(pump[i:j], 0.35 + 0.65 * np.linspace(0, 1, j - i) ** 0.6)
        k += 1
    mix = drums + (bass + mel) * pump
    fade = int(0.8 * SR)
    mix[-fade:] *= np.linspace(1, 0, fade)
    return mix / (np.abs(mix).max() + 1e-9) * 0.9


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out"); ap.add_argument("--style", default="phonk", choices=["phonk", "house", "lux"])
    ap.add_argument("--bpm", type=float, default=120); ap.add_argument("--seconds", type=float, default=32)
    ap.add_argument("--intro-beats", type=int, default=4)
    a = ap.parse_args()
    y = build(a.style, a.bpm, a.seconds, a.intro_beats)
    st = np.stack([y, np.roll(y, 40)], 1)
    with wave.open(a.out, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((st * 32767).astype(np.int16).tobytes())
    print(f"[beat] {a.style} {a.bpm} bpm {a.seconds}s, drop at {a.intro_beats * 60 / a.bpm:.2f}s -> {a.out}")


if __name__ == "__main__":
    main()
