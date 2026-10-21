import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const read = async name => JSON.parse(await fs.readFile(new URL(name, import.meta.url), 'utf8'));
const baseline = await read('baseline-c-summary.json');
const final = await read('final-c-summary.json');
const pressure = await read('final-pressure-summary.json');
const lifecycle = await read('lifecycle-summary.json');
const round = value => Math.round(value * 10) / 10;
const frame = r => ({ p95Ms: round(r.p95), maxMs: round(r.max), longTasksMs: r.longTasks, busyMs: round(r.busyMs) });
const report = {
  browser: final.browser,
  baseline: 'c4b80be',
  implementation: ['5849cb7', '277b001'],
  devices: ['desktop', 'mobile'].map(device => {
    const result = (data, name) => data.results.find(r => r.device === device && r.name === name);
    const load = data => data.loads.find(r => r.device === device && r.name === 'starfield');
    return { device,
      coldLoad: { baselineBytes: load(baseline).encodedBytes, finalBytes: load(final).encodedBytes, savedBytes: load(baseline).encodedBytes - load(final).encodedBytes },
      readerOpen: { baseline: frame(result(baseline, 'reader-open')), final: frame(result(final, 'reader-open')), cpu4x: frame(result(pressure, 'reader-open')) },
      remainingSearch: ['search-open', 'search-input', 'search-hover', 'search-close'].map(name => ({ name, final: frame(result(final, name)), cpu4x: frame(result(pressure, name)) })),
    };
  }),
  completedSamples: { baseline: baseline.results.length, final: final.results.length, cpu4x: pressure.results.length },
  finalOperationLongTasks: final.results.filter(r => r.longTasks.length),
  pageErrors: [baseline, final, pressure].flatMap(data => data.results.flatMap(r => r.errors)),
  networkFailures: [baseline, final, pressure].flatMap(data => data.networkFailures || []),
  lifecycle: lifecycle.results,
  limits: ['Chromium on one Mac; mobile is emulated, not a physical phone', 'RAF is a scheduling measure, not presented frames', 'Low power mode enabled; CPU throttling does not throttle the GPU', 'Operation long tasks exclude navigation/load tasks', 'Repeated-cycle heap measurements use forced GC and do not measure total GPU memory'],
};
assert.deepEqual(report.pageErrors, []);
assert.deepEqual(report.networkFailures.filter(failure => !failure.external && failure.error !== 'net::ERR_ABORTED'), []);
assert.deepEqual(report.finalOperationLongTasks, []);
await fs.writeFile(new URL('./comparison-summary.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ completedSamples: report.completedSamples, errors: report.pageErrors.length }));
