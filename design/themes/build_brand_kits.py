"""Zip each brand's illustrations and assets into a "brand kit" for Recraft and other image tools.

    pnpm design:kits                 -> design/exports/<brand>-brand-kit.zip (one per brand)
    pnpm design:kits --with-screens  also include the full-page screenshots

Standard library only. Kits are build output (git-ignored); rebuild after adding captures.
"""
import os
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INSPIRATION = os.path.join(ROOT, "inspiration")
OUT = os.path.join(ROOT, "exports")
IMAGES = (".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg")
SKIP_GROUPS = {"flags"}  # tiny UI icons, noise as style references

README = """{name} brand kit
{line}

Reference material captured from {name}'s website and app (Oct 2026) for design research.
Logos, characters and illustrations belong to {name}: use them only as references for
your own style, never in a shipped product.

  DESIGN.md        tokens (colour, type, radius, components) + a "style DNA" prompt paragraph
  palette.json     colours with roles, type and button specs read from the live CSS
  palette-board    the colours as one image
  illustrations/   characters, mascots and scene illustrations (web- = website, app- = iPhone app)
  vectors/         original SVG files from the website
  editorial/       design-blog, press and campaign images
  screens/         full-page screenshots (only in --with-screens kits)

Using it in Recraft
  1. Pick 2-5 images from illustrations/ that share one trait you want (shape, palette, pose).
  2. Upload them as style references (or "Create style"), one job per image.
  3. Paste the "style DNA" paragraph from DESIGN.md (Illustration & Imagery) into the prompt,
     then describe your own subject. Never name the brand in the prompt.
"""


def brands():
    found = {}
    for entry in sorted(os.listdir(INSPIRATION)):
        path = os.path.join(INSPIRATION, entry)
        if not os.path.isdir(path) or entry == "recraft-pack":
            continue
        key = entry[:-4] if entry.endswith("-web") else entry
        found.setdefault(key, []).append((path, "web" if entry.endswith("-web") else "app"))
    return found


def kit_entries(folders, with_screens):
    """Yield (path on disk, path inside the zip)."""
    for folder, source in folders:
        for name in ("DESIGN.md", "palette.json"):
            if os.path.exists(os.path.join(folder, name)):
                yield os.path.join(folder, name), name
        assets = os.path.join(folder, "assets")
        for dirpath, _, files in os.walk(assets):
            group = os.path.relpath(dirpath, assets).split(os.sep)[0]
            if group in SKIP_GROUPS:
                continue
            for f in sorted(files):
                if not f.lower().endswith(IMAGES):
                    continue
                if f.startswith("palette-board"):
                    yield os.path.join(dirpath, f), f
                elif group == "svg":
                    yield os.path.join(dirpath, f), f"vectors/{f}"
                elif group == "blog":
                    yield os.path.join(dirpath, f), f"editorial/{f}"
                else:
                    yield os.path.join(dirpath, f), f"illustrations/{source}-{f}"
        if with_screens:
            for f in sorted(os.listdir(folder)):
                if f.lower().endswith(IMAGES):
                    yield os.path.join(folder, f), f"screens/{source}-{f}"


def main():
    with_screens = "--with-screens" in sys.argv
    os.makedirs(OUT, exist_ok=True)
    for key, folders in brands().items():
        name = key[0].upper() + key[1:]
        target = os.path.join(OUT, f"{key}-brand-kit.zip")
        seen, count = set(), 0
        with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as z:
            z.writestr(f"{key}-brand-kit/README.txt", README.format(name=name, line="=" * (len(name) + 10)))
            for disk, inside in kit_entries(folders, with_screens):
                if inside in seen:
                    continue
                seen.add(inside)
                z.write(disk, f"{key}-brand-kit/{inside}")
                count += 1
        print(f"{os.path.relpath(target, os.path.dirname(ROOT))}: {count} files, {os.path.getsize(target) / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
