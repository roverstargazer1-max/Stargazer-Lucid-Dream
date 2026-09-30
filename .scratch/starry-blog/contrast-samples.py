"""Read saved screenshots; sample clear background beside functional text.

This is a local sample check, not an exhaustive accessibility audit. Glyph-edge
antialiasing, decorative artwork and animation frames are not contrast targets.
"""
from pathlib import Path
import json
from PIL import Image

root = Path(__file__).parent / 'evidence-v20'

def luminance(rgb):
    linear = [c / 255 / 12.92 if c / 255 <= .04045 else ((c / 255 + .055) / 1.055) ** 2.4 for c in rgb[:3]]
    return sum(c * weight for c, weight in zip(linear, (.2126, .7152, .0722)))

def ratio(foreground, background):
    a, b = sorted((luminance(foreground), luminance(background)))
    return (b + .05) / (a + .05)

rows = []
for file in ['cloud-dark-original.png', 'cloud-cloud-original.png', 'cloud-horizon-original.png', 'cloud-zenith-original.png']:
    img = Image.open(root / file).convert('RGB')
    for role, rect in [('navigation', (925, 25, 980, 34)), ('sky-controls', (35, 542, 175, 549)), ('path-legend', (990, 588, 1080, 594))]:
        bg = max((img.getpixel((x, y)) for y in range(rect[1], rect[3]) for x in range(rect[0], rect[2])), key=luminance)
        rows.append({'file': file, 'role': role, 'patch': rect, 'brightestBackground': bg, 'foreground': '#C4D4E1', 'contrast': round(ratio((196, 212, 225), bg), 2)})

img = Image.open(root / 'core-roof-1.1.png').convert('RGB')
for role, rect in [('date', (733, 190, 825, 198)), ('intro', (752, 316, 960, 325)), ('star-label', (466, 253, 594, 258))]:
    bg = max((img.getpixel((x, y)) for y in range(rect[1], rect[3]) for x in range(rect[0], rect[2])), key=luminance)
    rows.append({'file': 'core-roof-1.1.png', 'role': role, 'patch': rect, 'brightestBackground': bg, 'foreground': '#C4D4E1', 'contrast': round(ratio((196, 212, 225), bg), 2)})

for role, color in [('body', (52, 72, 94)), ('paper-secondary', (79, 99, 117))]:
    rows.append({'role': role, 'background': '#E6E7E0', 'foreground': color, 'contrast': round(ratio(color, (230, 231, 224)), 2)})

(root / 'contrast-samples.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'samples': len(rows), 'minimum': min(row['contrast'] for row in rows), 'below4_5': [row for row in rows if row['contrast'] < 4.5]}, ensure_ascii=False))
