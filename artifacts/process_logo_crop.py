"""Copy original logo and crop lime I/TD mark for favicons."""
from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image

SRC = Path(
    r"C:\Users\SablineKoster\.cursor\projects\empty-window\assets"
    r"\c__Users_SablineKoster_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_itd-logo-77ecc91e-a1c6-487b-9522-4df0d26212fc.png"
)
ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "artifacts"
PUBLIC = ROOT / "public"
REPORT = ARTIFACTS / "logo-crop-report.txt"


def is_lime(r: int, g: int, b: int, a: int = 255) -> bool:
    return a > 200 and g > 150 and g >= r and (g - b) > 35


def main() -> None:
    ARTIFACTS.mkdir(exist_ok=True)
    PUBLIC.mkdir(exist_ok=True)

    for dest in (ARTIFACTS / "original-logo.png", PUBLIC / "logo.png"):
        shutil.copy2(SRC, dest)

    im = Image.open(SRC).convert("RGBA")
    w, h = im.size
    px = im.load()
    xs: list[int] = []
    ys: list[int] = []
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if is_lime(r, g, b, a):
                xs.append(x)
                ys.append(y)

    if not xs:
        raise SystemExit("no lime pixels found")

    pad = 2
    left = max(0, min(xs) - pad)
    top = max(0, min(ys) - pad)
    right = min(w - 1, max(xs) + pad)
    bottom = min(h - 1, max(ys) + pad)
    crop = im.crop((left, top, right + 1, bottom + 1))

    cr, cg, cb, _ = crop.getpixel((crop.width // 2, crop.height // 2))
    lime_hex = f"#{cr:02x}{cg:02x}{cb:02x}"

    crop.save(ARTIFACTS / "favicon-source.png")
    crop.save(PUBLIC / "favicon.png")

    for size, name in ((32, "favicon-32.png"), (180, "favicon-180.png")):
        sq = Image.new("RGBA", (size, size), (cr, cg, cb, 255))
        pad_px = max(1, size // 16)
        inner = size - pad_px * 2
        ratio = min(inner / crop.width, inner / crop.height)
        nw = max(1, int(crop.width * ratio))
        nh = max(1, int(crop.height * ratio))
        resized = crop.resize((nw, nh), Image.Resampling.LANCZOS)
        ox = (size - nw) // 2
        oy = (size - nh) // 2
        sq.paste(resized, (ox, oy), resized)
        sq.save(PUBLIC / name)

    lines = [
        f"original_size={w}x{h}",
        f"crop_box=({left}, {top}, {right}, {bottom})",
        f"crop_size={crop.width}x{crop.height}",
        f"lime_hex={lime_hex}",
        "",
        "outputs:",
    ]
    for path in (
        ARTIFACTS / "original-logo.png",
        ARTIFACTS / "favicon-source.png",
        PUBLIC / "logo.png",
        PUBLIC / "favicon.png",
        PUBLIC / "favicon-32.png",
        PUBLIC / "favicon-180.png",
    ):
        lines.append(f"  {path.relative_to(ROOT)}  {path.stat().st_size} bytes")

    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(REPORT.read_text(encoding="utf-8"))


if __name__ == "__main__":
    main()
