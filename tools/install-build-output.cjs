const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

// Keep recovery data beside the destination, outside the disposable build staging.
function installBuildOutput(output, target, filesystem = fs) {
  const backup = path.join(path.dirname(target), `.${path.basename(target)}-previous-${randomUUID()}`);
  let previousMoved = false;
  try {
    if (filesystem.existsSync(target)) {
      filesystem.renameSync(target, backup);
      previousMoved = true;
    }
    filesystem.renameSync(output, target);
  } catch (installError) {
    if (previousMoved) {
      try {
        filesystem.renameSync(backup, target);
      } catch (restoreError) {
        throw new AggregateError([installError, restoreError],
          `Could not install the build or restore the previous output. Previous output is preserved at ${backup}.`);
      }
    }
    throw installError;
  }
  if (previousMoved) filesystem.rmSync(backup, { recursive: true, force: true });
}

module.exports = { installBuildOutput };
