"""Build lossless display caches; the original published PNGs remain untouched."""
import json
import re
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[3]
OUTPUT = ROOT / 'themes/stargazer-starfield/source/images/optimized'
OUTPUT.mkdir(parents=True, exist_ok=True)
geometry = json.loads((ROOT / 'assets/检索页/entry-heading/geometry.json').read_text())
base = Image.open(ROOT / 'assets/蓝紫星盘.png')
repair = Image.open(ROOT / 'assets/检索页/entry-heading/disc-repair.png')
assert list(base.size) == list(repair.size) == geometry['size']

def save(image, source, name):
    path = OUTPUT / name
    options = {'icc_profile': source.info['icc_profile']} if source.info.get('icc_profile') else {}
    image.save(path, lossless=True, method=6, exact=True, **options)
    assert Image.open(path).convert(image.mode).tobytes() == image.tobytes()
    print(f'{name}: {path.stat().st_size} bytes, pixel-exact cache')

save(base.convert('RGB'), base, 'entry-base.webp')

# The repair is only visible through its existing narrow stencil. Retain the
# surrounding 64 native pixels for downsampling kernels, and make unused pixels
# transparent. Keeping the full canvas size preserves every existing clip/pivot.
points = [(float(x) / 100 * repair.width, float(y) / 100 * repair.height)
          for x, y in re.findall(r'([\d.]+)% ([\d.]+)%', geometry['repairClip'])]
assert len(points) >= 3
mask = Image.new('L', repair.size)
draw = ImageDraw.Draw(mask)
draw.polygon(points, fill=255)
draw.line(points + points[:1], fill=255, width=128)
for x, y in points:
    draw.ellipse((x - 64, y - 64, x + 64, y + 64), fill=255)
sparse = Image.new('RGBA', repair.size)
sparse.paste(repair.convert('RGBA'), (0, 0), mask)
save(sparse, repair, 'entry-repair.webp')
