"""Labelled contact sheet of every screen in one or more app folders, for reviewing a collection.

    uv run --with pillow python contact_sheet.py design/inspiration/duolingo [...] --out /tmp/sheet.png
"""
import argparse
import glob
import os

from PIL import Image, ImageDraw

p = argparse.ArgumentParser()
p.add_argument("folders", nargs="+")
p.add_argument("--out", required=True)
p.add_argument("--cols", type=int, default=8)
a = p.parse_args()

files = [f for d in a.folders for f in sorted(glob.glob(os.path.join(d, "*.png")))]
W, H, LABEL = 163, 359, 16
rows = (len(files) + a.cols - 1) // a.cols
sheet = Image.new("RGB", (a.cols * W, max(rows, 1) * (H + LABEL)), "white")
draw = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    x, y = (i % a.cols) * W, (i // a.cols) * (H + LABEL)
    sheet.paste(Image.open(f).convert("RGB").resize((W, H)), (x, y + LABEL))
    draw.text((x + 4, y + 2), f"{os.path.basename(os.path.dirname(f))}/{os.path.basename(f)}"[:26], fill="black")
sheet.save(a.out)
print(f"{len(files)} screens -> {a.out}")
