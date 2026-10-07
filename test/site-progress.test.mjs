import {test} from 'node:test';
import assert from 'node:assert/strict';
import {progressForEdits} from '../scripts/site-progress.mjs';

test('each edit adds one tenth with exact decimal display values and a 100% cap', () => {
  assert.equal(progressForEdits(0), 52);
  assert.equal(progressForEdits(1), 52.1);
  assert.equal(progressForEdits(10), 53);
  assert.equal(progressForEdits(480), 100);
  assert.equal(progressForEdits(999), 100);
});
