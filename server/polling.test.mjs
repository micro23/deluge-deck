import test from 'node:test';
import assert from 'node:assert/strict';
import { createPoller } from './polling.mjs';

test('polling waits for completion and respects the latest interval without overlapping requests', async () => {
  let finish;
  let requests = 0;
  let interval = 1500;
  const scheduled = [];
  const poller = createPoller({
    refresh: () => { requests++; return new Promise(resolve => { finish = resolve; }); },
    visible: () => true,
    delay: () => interval,
    schedule: (callback, ms) => { scheduled.push({ callback, ms }); },
    cancel: () => {},
  });
  const pending = poller.wake();
  await poller.wake();
  assert.equal(requests, 1);
  assert.equal(scheduled.length, 0);
  interval = 5000;
  finish();
  await pending;
  assert.equal(scheduled[0].ms, 5000);
  poller.stop();
  await scheduled[0].callback();
  assert.equal(requests, 1);
});

test('hidden pages pause and stopping an in-flight poll prevents rescheduling', async () => {
  let visible = false;
  let finish;
  let requests = 0;
  let schedules = 0;
  const poller = createPoller({
    refresh: () => { requests++; return new Promise(resolve => { finish = resolve; }); },
    visible: () => visible,
    delay: () => 1500,
    schedule: () => { schedules++; },
    cancel: () => {},
  });
  await poller.wake();
  assert.equal(requests, 0);
  visible = true;
  const pending = poller.wake();
  poller.stop();
  finish();
  await pending;
  assert.equal(schedules, 0);
});
