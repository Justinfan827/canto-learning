"""Crop brand assets out of captured screens, from an app's assets.json, and build a review sheet.

assets.json is a list of {"src": "02-onboarding", "name": "duo-mascot-wave", "box": [x0, y0, x1, y1]},
with the box as fractions of the screen (0-1), so it works at any capture size. Crops go to
<app>/assets/<name>.png. Re-run after editing a box; check the review sheet each time.

    uv run --with pillow python crop_assets.py design/inspiration/duolingo [...] --review /tmp/assets.png
"""
import argparse
import json
import os

from PIL import Image, ImageDraw

p = argparse.ArgumentParser()
p.add_argument("apps", nargs="+")
p.add_argument("--review", required=True)
a = p.parse_args()

thumbs = []
for app in a.apps:
    spec = json.load(open(os.path.join(app, "assets.json")))
    os.makedirs(os.path.join(app, "assets"), exist_ok=True)
    for item in spec:
        im = Image.open(os.path.join(app, item["src"] + ".png"))
        W, H = im.size
        x0, y0, x1, y1 = item["box"]
        crop = im.crop((int(x0 * W), int(y0 * H), int(x1 * W), int(y1 * H)))
        crop.save(os.path.join(app, "assets", item["name"] + ".png"))
        t = crop.copy()
        t.thumbnail((220, 220))
        thumbs.append((f"{os.path.basename(app)}/{item['name']}", t))

cols, cw, ch = 6, 230, 250
rows = (len(thumbs) + cols - 1) // cols
sheet = Image.new("RGB", (cols * cw, max(rows, 1) * ch), "white")
draw = ImageDraw.Draw(sheet)
for i, (name, t) in enumerate(thumbs):
    x, y = (i % cols) * cw, (i // cols) * ch
    sheet.paste(t, (x + 5, y + 18))
    draw.text((x + 4, y + 3), name[:34], fill="black")
sheet.save(a.review)
print(f"{len(thumbs)} assets -> {a.review}")
