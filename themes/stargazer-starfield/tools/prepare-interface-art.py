"""Prepare display caches for UI art, preserving all published originals.

Requires Pillow and cwebp only when regenerating these committed artifacts.
"""
from pathlib import Path
from hashlib import sha256
from PIL import Image, ImageChops, ImageStat
import json
import subprocess
import sys

theme = Path(__file__).resolve().parents[1]
project = theme.parents[1]
directory = theme / 'source/images/optimized'
items = [
    ('search-base', 'images/search/base-v3.png', 'assets/检索页/v3/base-v3.png', 'sharp', None),
    ('entry-base', 'images/optimized/entry-base.webp', 'themes/stargazer-starfield/source/images/optimized/entry-base.webp', 'lossless', 384),
    ('entry-repair', 'images/optimized/entry-repair.webp', 'themes/stargazer-starfield/source/images/optimized/entry-repair.webp', 'lossless', 384),
    ('logo', 'images/branding/logo2.png', 'assets/代码程序素材/Logo/Logo2/Logo2.png', 'lossless', None),
    ('polyhedron', 'images/observation/polyhedron.png', 'assets/详情弹窗/详细工程文件/右下角跳动几何块.png', 'lossless', None),
    ('silhouette', 'images/observation/silhouette.png', 'themes/stargazer-starfield/source/images/observation/silhouette.png', 'lossless', None),
    ('search-frame', 'images/search/frame-v3.png', 'assets/检索页/v3/frame-v3.png', 'lossless', None),
    ('search-frame-background', 'images/search/frame-background-v3.png', 'assets/检索页/v3/frame-background-v3.png', 'lossless', None),
    ('reader-sheet', 'images/reader/sheet.webp', 'themes/stargazer-starfield/source/images/reader/sheet.webp', 'sharp', None),
    ('reader-continuation', 'images/reader/continuation.webp', 'themes/stargazer-starfield/source/images/reader/continuation.webp', 'sharp', None),
    ('reader-track', 'images/reader/progress-track.webp', 'themes/stargazer-starfield/source/images/reader/progress-track.webp', 'sharp', None),
]
artwork = 'assets/详情弹窗/详细工程文件'
for name, filename in [('waveform','声音频率.png'),('waves','波浪纹理.png'),('starlink','STARLINK.png'),('observation-id','OBS&ID.png'),('close','退出按钮.png')]:
    items.append((f'observation-{name}', f'images/observation/{name}.png', f'{artwork}/{filename}', 'lossless', None))
for name in ['year-pointer','diamond','dial-ticks','dial-bracket','date-boxes','call-label','call-word','call-underline','hour-label','read-rule']:
    items.append((f'observation-{name}', f'images/observation/{name}.png', f'{artwork}/supplement-crops/{name}.png', 'lossless', None))
items.append(('observation-read','images/observation/read.png','assets/补充素材/补充/READ重设计.png','lossless',None))
glyph_folder = next(folder for folder in ['科技小字-修订版7-透明字形','zmd科技小字-修订版7-透明字形'] if (project / 'assets' / folder).exists())
for character in '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ':
    group = '数字' if character.isdigit() else '大写字母'
    items.append((f'glyph-{character}',f'images/observation/glyphs/{character}.png',f'assets/{glyph_folder}/透明PNG/{group}/{character}.png','lossless',None))
try:
    previous = {entry['source']:entry for entry in json.loads((directory / 'interface-cache.json').read_text())['entries']}
except (FileNotFoundError, ValueError, KeyError):
    previous = {}
entries = []
for name, public_path, source_path, mode, side in items:
    source = project / source_path
    saved = previous.get(public_path)
    same_recipe = saved and saved['lossless'] == (mode == 'lossless') and (
        saved['cacheDimensions'][0] if saved['resampled'] else None) == side
    if '--force' not in sys.argv and same_recipe and saved['sourceSha256'] == sha256(source.read_bytes()).hexdigest():
        saved_path = theme / 'source' / saved['cache']
        if saved_path.exists() and sha256(saved_path.read_bytes()).hexdigest() == saved['cacheSha256']:
            entries.append(saved)
            continue
    original = Image.open(source).convert('RGBA')
    cache_path = f'images/optimized/interface-{name}-v1.webp'
    target = theme / 'source' / cache_path
    expected = original
    if side:
        expected = original.resize((side, side), Image.Resampling.LANCZOS)
        expected.save(target, 'WEBP', lossless=True, exact=True, method=6, icc_profile=Image.open(source).info.get('icc_profile', b''))
    else:
        args = ['cwebp', '-quiet', '-m', '6', '-metadata', 'icc']
        args += ['-lossless', '-exact'] if mode == 'lossless' else ['-q', '100', '-sharp_yuv']
        subprocess.run(args + [str(source), '-o', str(target)], check=True)
    cached = Image.open(target).convert('RGBA')
    assert cached.size == expected.size
    assert ImageChops.difference(expected.getchannel('A'), cached.getchannel('A')).getbbox() is None
    if mode == 'lossless':
        assert cached.tobytes() == expected.tobytes()
    alpha = expected.getchannel('A')
    difference = ImageChops.multiply(ImageChops.difference(expected.convert('RGB'), cached.convert('RGB')), Image.merge('RGB', (alpha, alpha, alpha)))
    mean_error = sum(ImageStat.Stat(difference).mean) / 3
    assert mean_error < 1
    entries.append({
        'source': public_path, 'sourceFile': source_path, 'sourceSha256': sha256(source.read_bytes()).hexdigest(),
        'cache': cache_path, 'cacheSha256': sha256(target.read_bytes()).hexdigest(),
        'sourceBytes': source.stat().st_size, 'cacheBytes': target.stat().st_size,
        'sourceDimensions': original.size, 'cacheDimensions': cached.size,
        'lossless': mode == 'lossless', 'resampled': bool(side),
        'meanVisibleChannelErrorAfterResampling': mean_error,
    })
(directory / 'interface-cache.json').write_text(json.dumps({'version': 1, 'entries': entries}, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(entries, ensure_ascii=False, indent=2))
