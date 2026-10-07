"""Helpers for design research on the iPhone, for use inside `phone-harness` scripts.

Load at the top of a script:
    exec(open("<repo>/.claude/skills/app-design-research/scripts/phone_helpers.py").read())
"""
import os


def hires(path):
    """Capture the iPhone Mirroring window at full Retina resolution (652x1436 on a 2x display).

    The harness's own screenshot() is 1x (326x718), too small to keep. Raises when the
    window is on another Space.
    """
    import Quartz
    wid = screen_info()["window"]["id"]  # noqa: F821 (pre-imported by phone-harness)
    img = Quartz.CGWindowListCreateImage(
        Quartz.CGRectNull, Quartz.kCGWindowListOptionIncludingWindow, wid,
        Quartz.kCGWindowImageBoundsIgnoreFraming | Quartz.kCGWindowImageBestResolution)
    if img is None or Quartz.CGImageGetWidth(img) == 0:
        raise RuntimeError("hires capture returned nothing (mirroring window on another Space?)")
    os.makedirs(os.path.dirname(str(path)), exist_ok=True)
    url = Quartz.CFURLCreateWithFileSystemPath(None, str(path), Quartz.kCFURLPOSIXPathStyle, False)
    dest = Quartz.CGImageDestinationCreateWithURL(url, "public.png", 1, None)
    Quartz.CGImageDestinationAddImage(dest, img, None)
    Quartz.CGImageDestinationFinalize(dest)
    return str(path)


# Screens that must stop the walk and go back to the user: accounts, payment, personal data.
STOP_WORDS = ("sign up", "create account", "create a profile", "create profile", "password", "email",
              "free trial", "try 1 month", "subscribe", "$", "how old", "your age", "iphone in use")
NEXT_BUTTONS = ("continue", "next", "got it", "let's go", "start", "start learning", "not now",
                "no thanks", "skip", "maybe later", "later")


def walk(folder, prefix, start=1, answers=(), limit=10):
    """Capture screens and press through them until a stop screen, a repeat, or no next button.

    `answers` are option labels to pick when present (e.g. "I'm new", "Travel"). Captures go to
    `folder/NN-prefix.png`. Returns (next index, last OCR texts) so the caller can take over.
    """
    n, prev = start, None
    for _ in range(limit):
        wait_stable()  # noqa: F821
        texts = [b["text"] for b in ocr()]  # noqa: F821
        if texts == prev:
            print("screen did not change; stopping")
            break
        prev = texts
        hires(os.path.join(folder, f"{n:02d}-{prefix}.png"))
        print(n, texts[:16])
        n += 1
        low = " ".join(texts).lower()
        if any(w in low for w in STOP_WORDS):
            print("STOP: needs the user (account, payment, personal data or phone in use)")
            break
        pick = next((a for a in answers if any(a.lower() in t.lower() for t in texts)), None)
        if pick:
            tap_text(pick)  # noqa: F821
            wait_stable()  # noqa: F821
            texts = [b["text"] for b in ocr()]  # noqa: F821
        btn = next((t for t in texts if t.strip().lower() in NEXT_BUTTONS), None)
        if not btn:
            print("no next button; stopping")
            break
        tap_text(btn)  # noqa: F821
    return n, prev
