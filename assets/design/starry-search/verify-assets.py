"""Validate archived PNGs and the supplied title recolouring evidence."""
from pathlib import Path
from PIL import Image
import hashlib
import json

root = Path(__file__).resolve().parent
pngs = sorted(root.glob('astrolabe-entry-v*/*.png'))
study = root / 'title-color-study-v1'
pngs += sorted(study.rglob('*.png'))
rows = []
for file in pngs:
    with Image.open(file) as im:
        im.load()
        row = {'file': file.relative_to(root).as_posix(), 'size': list(im.size), 'mode': im.mode}
        if file.name.startswith('astrolabe-entry'):
            assert im.mode == 'RGBA', file
            assert im.size == (1254, 1254), file
            assert im.getchannel('A').getextrema() == (0, 255), file
            row['alphaRange'] = [0, 255]
        rows.append(row)

titles = []
for saved in json.loads((study / 'verification.json').read_text(encoding='utf-8')):
    with Image.open(study / 'references' / f"{saved['name']}-original.png") as source:
        original = source.convert('RGBA')
    with Image.open(study / saved['file']) as target:
        output = target.convert('RGBA')
    assert original.size == output.size == (saved['width'], saved['height'])
    # Evidence hashes use a byte value of 1 per glyph pixel, in row-major order.
    original_mask = bytes(1 if value >= 38 else 0 for value in original.getchannel('R').tobytes())
    alpha = output.getchannel('A').tobytes()
    output_mask = bytes(1 if value > 0 else 0 for value in alpha)
    assert original_mask == output_mask, saved['name']
    assert hashlib.sha256(original_mask).hexdigest() == saved['maskSha256'], saved['name']
    assert sum(output_mask) == saved['glyphPixels']
    assert alpha.count(0) == saved['transparentPixels']
    assert alpha.count(255) == saved['opaquePixels']
    titles.append({'file': saved['file'], 'glyphMaskUnchanged': True, 'maskSha256': saved['maskSha256']})

result = {'date': '2026-10-12', 'passed': True, 'decodedPNGs': len(rows), 'pngs': rows, 'titleMasks': titles}
(root / 'asset-validation-summary.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps(result, ensure_ascii=False))
