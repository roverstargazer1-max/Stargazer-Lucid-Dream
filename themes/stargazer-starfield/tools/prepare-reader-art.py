"""Compose the author's PNG layers and separate the fixed progress bar artwork."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / 'assets/代码程序素材/文章页'
OUTPUT = ROOT / 'themes/stargazer-starfield/source/images/reader'
OUTPUT.mkdir(parents=True, exist_ok=True)

overlay = Image.open(SOURCE / '文字底拼接素材/01正式稿文字底.png').convert('RGBA')
background = Image.open(SOURCE / '文章背景底/正式稿背景底.png').convert('RGBA').resize(overlay.size)
background.alpha_composite(overlay)
sheet = Image.new('RGBA', background.size, '#0862c5')
sheet.alpha_composite(background)
# Use the supplied continuation layer over the lower part of the same night scene.
continuation = Image.open(SOURCE / '文字底拼接素材/02正式稿文字底l拼接.png').convert('RGBA')
night = Image.open(SOURCE / '文章背景底/正式稿背景底.png').convert('RGBA')
night = night.crop((0, night.height - continuation.height, night.width, night.height)).resize(continuation.size)
night.alpha_composite(continuation)
tile = Image.new('RGBA', night.size, '#0862c5')
tile.alpha_composite(night)
tile = tile.resize((sheet.width, tile.height))
# Blend only the joins, retaining the original scene everywhere else.
edge = tile.crop((0, 0, tile.width, 1))
for image, at_end in [(sheet, True), (tile, False), (tile, True)]:
    for offset in range(64):
        y = image.height - 1 - offset if at_end else offset
        row = image.crop((0, y, image.width, y + 1))
        image.paste(Image.blend(row, edge, (1 - offset / 64) ** 2), (0, y))
sheet.convert('RGB').save(OUTPUT / 'sheet.webp', lossless=True)
tile.convert('RGB').save(OUTPUT / 'continuation.webp', lossless=True)

# The cleaner source has the same bar as the final mockup, without layer ghosts.
source = Image.open(SOURCE / '文字固定框/文字框底.png').convert('RGBA')
bar = source.crop((0, 325, source.width, 465))
# Remove the baked-in walker and sample labels so they can reflect live reading.
bar.paste((0, 0, 0, 255), (980, 0, 1080, 68))
bar.paste((0, 0, 0, 255), (185, 14, 286, 46))
bar.paste((0, 0, 0, 255), (2010, 84, 2100, 125))
# Restore the rail from the author's unfilled section rather than drawing new art.
rail = source.crop((1800, 384, 2140, 393)).resize((1972, 9))
bar.paste(rail, (170, 59))
bar.save(OUTPUT / 'progress-track.webp', lossless=True)
walker = source.crop((980, 236, 1075, 384))
# Isolate the white reference character from its black/blue background.
pixels = walker.load()
for y in range(walker.height):
    for x in range(walker.width):
        r, g, b, a = pixels[x, y]
        if min(r, g, b) < 130 or max(r, g, b) - min(r, g, b) > 45:
            pixels[x, y] = (255, 255, 255, 0)
walker.save(OUTPUT / 'walker.png')
