"""Crop the actual starfield capture into vertically seamless reading textures.

Only the wrap overlap is blended; all other pixels retain the original painting.
The built textures are checked in. Normal blog builds do not require Pillow.
"""
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageStat

THEME = Path(__file__).resolve().parents[1]
SOURCE = THEME / "source/images/fallback-sky.webp"
DESTINATION = THEME / "source/images/journal"
CROPS = {
    "sky-repeat-desktop-v1.webp": (1350, 0, 2450, 1220),
    "sky-repeat-mobile-v1.webp": (1740, 0, 2380, 1220),
}
OVERLAP = 220


def prepare():
    original = Image.open(SOURCE).convert("RGB")
    DESTINATION.mkdir(parents=True, exist_ok=True)
    results = {}
    for filename, box in CROPS.items():
        crop = original.crop(box)
        width, height = crop.size
        tile = crop.crop((0, OVERLAP, width, height))
        # The last row finishes at the source row immediately before our first
        # row, so repeat-y crosses a natural one-pixel step rather than a cut.
        head = crop.crop((0, 0, width, OVERLAP))
        tail = crop.crop((0, height - OVERLAP, width, height))
        mask = Image.new("L", (1, OVERLAP))
        values = []
        for row in range(OVERLAP):
            progress = row / (OVERLAP - 1)
            smooth = progress ** 3 * (progress * (progress * 6 - 15) + 10)
            values.append(round(smooth * 255))
        mask.putdata(values)
        mask = mask.resize((width, OVERLAP), Image.Resampling.NEAREST)
        tile.paste(Image.composite(head, tail, mask), (0, height - OVERLAP * 2))
        tile.save(DESTINATION / filename, lossless=True, method=6)
        # Reopen the published bytes to verify the lossless encoding and seam.
        saved = Image.open(DESTINATION / filename).convert("RGB")
        assert ImageChops.difference(saved, tile).getbbox() is None
        edge_difference = ImageStat.Stat(ImageChops.difference(
            saved.crop((0, 0, width, 1)), saved.crop((0, saved.height - 1, width, saved.height))
        )).mean
        results[filename] = {"crop": box, "size": saved.size, "overlap": OVERLAP,
                             "seam_mean_rgb_difference": edge_difference,
                             "bytes": (DESTINATION / filename).stat().st_size}
    print(json.dumps({"source": str(SOURCE.relative_to(THEME)), "textures": results}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    prepare()
