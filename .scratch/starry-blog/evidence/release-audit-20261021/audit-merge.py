"""Compare the restored release with its feature tip and the deployed changed assets."""
import concurrent.futures
import hashlib
import json
import subprocess
from pathlib import Path

RELEASE = '5360482'
FEATURE = '31bc881'
ORIGIN = 'https://blog.stargazer-luciddream.top'
def git(*args):
    return subprocess.check_output(['git', *args])
def digest(data):
    return hashlib.sha256(data).hexdigest()

commits = git('log', '--reverse', '--format=%h %s', 'dd31f20^1..' + FEATURE).decode().splitlines()
delta = git('diff', '--name-only', FEATURE, RELEASE).decode().splitlines()
expected_delta = {
    'docs/design/starry-blog.md', 'docs/operations/starfield-blog.md', 'tests/static-output.test.cjs',
    'themes/stargazer-starfield/layout/index.ejs', 'themes/stargazer-starfield/source/css/starry/site.css',
    'themes/stargazer-starfield/source/images/fallback-sky.webp',
}
assert set(delta) == expected_delta, 'Restored release differs from its feature tip outside the approved fallback'
paths = git('diff', '--name-only', 'dd31f20^1', FEATURE, '--',
            'themes/stargazer-starfield/source', 'source/image').decode().splitlines()
def inspect(source):
    route = source.removeprefix('themes/stargazer-starfield/source/') if source.startswith('themes/') else source.removeprefix('source/')
    expected = git('show', RELEASE + ':' + source)
    actual = subprocess.check_output(['curl', '-fsS', '--max-time', '25', ORIGIN + '/' + route])
    return {'source': source, 'route': '/' + route, 'expected': digest(expected), 'live': digest(actual), 'matches': actual == expected}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    assets = list(pool.map(inspect, paths))
room = 'source/image/starfield/room-poster-detail-v20.webp'
versioned = subprocess.check_output(['curl', '-fsS', '--max-time', '25', ORIGIN + '/image/starfield/room-poster-detail-v20.webp?v=d79d9a54cf3480c0'])
result = {'release': RELEASE, 'featureTip': FEATURE, 'commits': commits, 'expectedFallbackDelta': delta,
          'changedRuntimeAssets': assets, 'versionedRoomMatchesRemoval': digest(versioned) == digest(git('show', FEATURE + ':' + room))}
Path(__file__).with_name('merge-audit-summary.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'restoredCommits': len(commits), 'unexpectedTreeDifferences': 0, 'runtimeAssets': len(assets),
                  'matchingAssets': sum(item['matches'] for item in assets), 'mismatches': [item['route'] for item in assets if not item['matches']],
                  'versionedRoomMatchesRemoval': result['versionedRoomMatchesRemoval']}, ensure_ascii=False, indent=2))
