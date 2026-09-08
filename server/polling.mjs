// Schedule from completion, so slow requests never overlap the next poll.
export function createPoller({ refresh, delay, visible, schedule = setTimeout, cancel = clearTimeout }) {
  let stopped = false;
  let running = false;
  let timer;
  const wake = async () => {
    cancel(timer);
    if (stopped || running || !visible()) return;
    running = true;
    try {
      await refresh();
    } finally {
      running = false;
      if (!stopped && visible()) timer = schedule(wake, delay());
    }
  };
  return {
    wake,
    stop() { stopped = true; cancel(timer); },
  };
}
