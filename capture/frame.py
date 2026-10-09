#!/usr/bin/env python3
"""Wrap raw screenshots in a clean browser window with the real URL in the address bar.

Usage: python3 capture/frame.py requests/2026-10-10.json
Reads raw/<out>, writes <out>.
"""
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = os.path.join(HERE, "..", "fonts", "Inter-Medium.otf")
BG = "#E9ECF1"
BAR = "#F7F8FA"


def frame(raw_path, out_path, url, mobile):
    shot = Image.open(raw_path).convert("RGB")
    s = 2  # screenshots are @2x
    bar_h = 52 * s
    radius = (36 if mobile else 14) * s
    pad = (60 if mobile else 72) * s
    win_w, win_h = shot.width, shot.height + bar_h

    win = Image.new("RGB", (win_w, win_h), BAR)
    d = ImageDraw.Draw(win)
    if not mobile:
        for i, c in enumerate(["#FF5F57", "#FEBC2E", "#28C840"]):
            cx = 22 * s + i * 20 * s
            d.ellipse([cx, 20 * s, cx + 12 * s, 32 * s], fill=c)
    # Address bar with the real URL
    host = url.replace("https://", "").rstrip("/")
    f = ImageFont.truetype(FONT, 15 * s)
    tw = d.textlength(host, font=f)
    bw = max(tw + 56 * s, (win_w * 0.42))
    bx = (win_w - bw) / 2
    d.rounded_rectangle([bx, 12 * s, bx + bw, 40 * s], radius=9 * s, fill="#ECEEF2")
    d.text(((win_w - tw) / 2, 17 * s), host, font=f, fill="#4B5160")
    d.line([0, bar_h - 1, win_w, bar_h - 1], fill="#E1E4EA", width=s)
    win.paste(shot, (0, bar_h))

    mask = Image.new("L", win.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, win_w, win_h], radius=radius, fill=255)

    canvas = Image.new("RGB", (win_w + 2 * pad, win_h + 2 * pad), BG)
    shadow = Image.new("L", canvas.size, 0)
    ImageDraw.Draw(shadow).rounded_rectangle([pad, pad + 10 * s, pad + win_w, pad + win_h + 10 * s], radius=radius, fill=70)
    shadow = shadow.filter(ImageFilter.GaussianBlur(18 * s))
    canvas.paste(Image.new("RGB", canvas.size, "#9AA3B2"), (0, 0), shadow)
    canvas.paste(win, (pad, pad), mask)

    # Keep files a sensible size for social networks
    max_w = 2400
    if canvas.width > max_w:
        canvas = canvas.resize((max_w, round(canvas.height * max_w / canvas.width)), Image.LANCZOS)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    canvas.save(out_path, "PNG", optimize=True)
    print(out_path)


def main():
    req = json.load(open(sys.argv[1]))
    for shot in req.get("shots", []):
        raw = os.path.join("raw", shot["out"])
        if os.path.exists(raw) and not os.path.exists(shot["out"]):
            frame(raw, shot["out"], shot["url"], bool(shot.get("mobile")))


if __name__ == "__main__":
    main()
