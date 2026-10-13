"""Inspect the supplied bitmap outline for a CSS crop. No image pixels are edited."""
from PIL import Image
import numpy as np
import json

pixels = np.array(Image.open('assets/蓝紫星盘.png').convert('RGB'))
mask = pixels.min(axis=2) < 225
h, w = mask.shape
edges = {}
for y, x in zip(*np.where(mask)):
    if y == 0 or not mask[y - 1, x]: edges[(int(x), int(y))] = (int(x + 1), int(y))
    if x == w - 1 or not mask[y, x + 1]: edges[(int(x + 1), int(y))] = (int(x + 1), int(y + 1))
    if y == h - 1 or not mask[y + 1, x]: edges[(int(x + 1), int(y + 1))] = (int(x), int(y + 1))
    if x == 0 or not mask[y, x - 1]: edges[(int(x), int(y + 1))] = (int(x), int(y))
contours = []
while edges:
    start = next(iter(edges))
    point, contour = start, []
    while point in edges:
        contour.append(point)
        point = edges.pop(point)
        if point == start: break
    contours.append(contour)
contour = max(contours, key=len)

def simplify(points, tolerance=1.5):
    if len(points) < 3: return points
    a, b = np.array(points[0]), np.array(points[-1])
    ab = b - a
    sample = np.array(points[1:-1])
    distance = np.linalg.norm(sample - a, axis=1) if np.linalg.norm(ab) == 0 else np.abs(ab[0] * (sample[:, 1] - a[1]) - ab[1] * (sample[:, 0] - a[0])) / np.linalg.norm(ab)
    index = int(distance.argmax()) + 1
    if distance[index - 1] <= tolerance: return [points[0], points[-1]]
    return simplify(points[:index + 1], tolerance)[:-1] + simplify(points[index:], tolerance)

points = simplify(contour + [contour[0]])[:-1]
result = {'source': 'assets/蓝紫星盘.png', 'size': [w, h], 'vertices': len(points), 'clip': 'polygon(' + ','.join(f'{x / w * 100:.3f}% {y / h * 100:.3f}%' for x, y in points) + ')'}
print(json.dumps(result, ensure_ascii=False))
