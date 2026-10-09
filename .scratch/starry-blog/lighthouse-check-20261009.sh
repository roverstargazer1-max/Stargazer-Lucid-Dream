#!/bin/zsh
export PATH=/Users/Stargazer/.npm/_npx/707631dc084b9937/node_modules/node/bin:$PATH
export CHROME_PATH='/Users/Stargazer/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
for label in baseline optimized; do
  if [[ "$label" == baseline ]]; then target_url=http://127.0.0.1:4177/; else target_url=http://127.0.0.1:4175/; fi
  for device in mobile desktop; do
    for repeat in 1 2 3; do
      preset_args=()
      if [[ "$device" == desktop ]]; then preset_args=(--preset=desktop); fi
      node /Users/Stargazer/.npm/_npx/0f94ee7615faf582/node_modules/lighthouse/cli/index.js "$target_url" --only-categories=performance --chrome-flags='--headless' --output=json --output=html --output-path=".scratch/starry-blog/evidence/performance-20261009/$label-$device-$repeat" --quiet "${preset_args[@]}"
      if [[ $? != 0 ]]; then exit 1; fi
      node -e 'const r=require(process.argv[1]); console.log(JSON.stringify({report:process.argv[1],score:r.categories.performance.score,metrics:r.audits.metrics.details.items[0],error:r.runtimeError}));' "./.scratch/starry-blog/evidence/performance-20261009/$label-$device-$repeat.report.json"
    done
  done
 done
