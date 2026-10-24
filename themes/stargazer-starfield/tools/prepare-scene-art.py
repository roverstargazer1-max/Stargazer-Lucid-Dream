"""Prepare high-quality display caches; never overwrite the authored illustrations.

Maintenance only: requires cwebp and Pillow. Normal builds use committed caches.
"""
from pathlib import Path
from hashlib import sha256
from PIL import Image, ImageChops, ImageStat
import json
import math
import subprocess

theme = Path(__file__).resolve().parents[1]
project = theme.parents[1]
directory = theme / 'source/images/optimized'
entries = []
for name, kind in [('room-poster-detail-v20', 'room'), ('painted-sky-v11', 'sky')]:
    source_path = f'image/starfield/{name}.webp'
    cache_path = f'images/optimized/scene-{kind}-v1.webp'
    source = project / 'source' / source_path
    target = theme / 'source' / cache_path
    subprocess.run(['cwebp', '-quiet', '-q', '100', '-sharp_yuv', '-m', '6', '-metadata', 'icc', str(source), '-o', str(target)], check=True)
    original = Image.open(source).convert('RGB')
    cached = Image.open(target).convert('RGB')
    assert original.size == cached.size
    difference = ImageChops.difference(original, cached)
    statistics = ImageStat.Stat(difference)
    mean_error = sum(statistics.mean) / 3
    histogram = difference.histogram()
    merged = [sum(histogram[channel * 256 + value] for channel in range(3)) for value in range(256)]
    total = sum(merged)
    cumulative = 0
    for p99_error, count in enumerate(merged):
        cumulative += count
        if cumulative >= total * .99:
            break
    assert mean_error <= 1 and p99_error <= 7, 'Display cache exceeds the reviewed fidelity bounds.'
    entries.append({
        'source': source_path, 'sourceSha256': sha256(source.read_bytes()).hexdigest(),
        'cache': cache_path, 'cacheSha256': sha256(target.read_bytes()).hexdigest(),
        'sourceBytes': source.stat().st_size, 'cacheBytes': target.stat().st_size,
        'dimensions': original.size, 'lossless': False, 'quality': 100, 'sharpYuv': True,
        'meanAbsoluteChannelError': mean_error, 'p99AbsoluteChannelError': p99_error,
        'psnrDb': 10 * math.log10(255 ** 2 / (sum(value ** 2 for value in statistics.rms) / 3)),
    })
(directory / 'scene-cache.json').write_text(json.dumps({'version': 1, 'entries': entries}, indent=2) + '\n')
print(json.dumps(entries, indent=2))
