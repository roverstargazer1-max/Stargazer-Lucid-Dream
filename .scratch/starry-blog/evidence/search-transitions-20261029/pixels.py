"""Compare the twelve matching screenshots produced by visual-check.mjs."""
import json
from pathlib import Path
from PIL import Image, ImageChops

root = Path(__file__).parent
results = []
for device in ['desktop', 'mobile', 'landscape']:
    for pose in ['0.25', '0.6', '1', 'rest']:
        before = Image.open(root / f'visual-{device}-before-{pose}.png').convert('RGB')
        after = Image.open(root / f'visual-{device}-after-{pose}.png').convert('RGB')
        assert before.size == after.size
        histogram = ImageChops.difference(before, after).histogram()
        mean = sum((i % 256) * count for i, count in enumerate(histogram)) / (before.width * before.height * 3)
        assert mean < .00001, f'{device}/{pose}: pixels changed beyond numeric rounding'
        results.append(dict(device=device, pose=pose, size=before.size, meanChannelDifference=round(mean, 6)))
(root / 'pixel-summary.json').write_text(json.dumps(results, indent=2) + '\n')
print(json.dumps(results))
