from PIL import Image
import numpy as np
import hashlib
import json
from pathlib import Path

ref = np.array(Image.open('assets/检索页/检索页v3.png').crop((259, 104, 2176, 1388)).convert('RGB'))
composite = Path('.scratch/starry-search/evidence/v3-20261012/composite-v3.png')
actual = np.array(Image.open(composite).convert('RGB'))
assert np.array_equal(ref, actual), 'Native Photoshop composite differs from the v3 reference'
summary = {'reference': 'assets/检索页/检索页v3.png', 'referencePanel': [259,104,2176,1388], 'psdPanel': [2944,165,4861,1449], 'size': [1917,1284], 'nativeCompositeMatchesReference': True, 'nativeCompositeSHA256': hashlib.sha256(composite.read_bytes()).hexdigest()}
Path('.scratch/starry-search/evidence/v3-20261012/comparison-summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
print('Native Photoshop composite matches every RGB pixel in the v3 panel.')
