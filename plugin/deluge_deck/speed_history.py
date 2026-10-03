"""Bounded aggregate transfer telemetry; no torrent names, paths or credentials."""
import json
import math
import os
import tempfile
from collections import deque

DAY = 86400000
TIERS = ((2000, 3600000), (60000, 2 * DAY), (900000, 90 * DAY))


def number(value, low, high):
    try:
        value = float(value)
        return int(max(low, min(high, value))) if math.isfinite(value) else low
    except (TypeError, ValueError, OverflowError):
        return low


class SpeedHistory:
    def __init__(self):
        self.rows = [deque(maxlen=keep // step + 2) for step, keep in TIERS]
        self.pending = [None, None]

    def add(self, timestamp, down, up):
        t = number(timestamp, 0, 2**53 - 1)
        down, up = number(down, 0, 2**53 - 1), number(up, 0, 2**53 - 1)
        if self.rows[0] and t <= self.rows[0][-1][0]:
            return
        self.rows[0].append([t, down, up])
        for i, (step, _) in enumerate(TIERS[1:]):
            key = t // step
            bucket = self.pending[i]
            if bucket and key != bucket[0]:
                self.rows[i + 1].append([bucket[4], round(bucket[1] / bucket[3]), round(bucket[2] / bucket[3])])
                bucket = None
            if bucket is None:
                bucket = [key, 0, 0, 0, t]
            bucket[1] += down
            bucket[2] += up
            bucket[3] += 1
            bucket[4] = t
            self.pending[i] = bucket
        self.trim(t)

    def trim(self, now):
        for rows, (_, keep) in zip(self.rows, TIERS):
            while rows and rows[0][0] < now - keep:
                rows.popleft()

    def query(self, now, span=300000, points=600):
        span = number(span, 60000, 90 * DAY)
        points = number(points, 2, 1200)
        self.trim(now)
        tier = next(i for i, (_, keep) in enumerate(TIERS) if keep >= span)
        step = TIERS[tier][0]
        samples = [r[:] for r in self.rows[tier] if now - span <= r[0] <= now]
        if tier and self.pending[tier - 1]:
            b = self.pending[tier - 1]
            if now - span <= b[4] <= now:
                samples.append([b[4], round(b[1] / b[3]), round(b[2] / b[3])])
        # Uniform time buckets bound the RPC response without fabricating gaps.
        if len(samples) > points:
            step = max(step, math.ceil(span / (points - 1)))
            groups = {}
            for t, down, up in samples:
                group = groups.setdefault(t // step, [0, 0, 0, 0])
                for i, v in enumerate((t, down, up)):
                    group[i] += v
                group[3] += 1
            samples = [[round(g[i] / g[3]) for i in range(3)] for g in groups.values()]
        return {'now': now, 'interval': step, 'samples': samples}

    def load(self, path, now):
        # Do not follow symlinks or allocate unbounded memory from a corrupt file.
        if os.path.islink(path):
            return
        with open(path, 'r', encoding='utf8') as source:
            data = source.read(2 * 1024 * 1024 + 1)
        if len(data) > 2 * 1024 * 1024:
            raise ValueError('Speed history file is too large')
        data = json.loads(data)
        if data.get('version') != 1:
            return
        for i, rows in enumerate(data.get('tiers', [])[:3]):
            if not isinstance(rows, list):
                continue
            valid = []
            for row in rows[-self.rows[i].maxlen:]:
                if (isinstance(row, list) and len(row) == 3 and
                        all(type(v) is int and 0 <= v <= 2**53 - 1 for v in row) and
                        now - TIERS[i][1] <= row[0] <= now):
                    valid.append(row)
            self.rows[i].extend(sorted({r[0]: r for r in valid}.values()))

    def save(self, path):
        # mkstemp creates a private file and cannot follow an attacker-made .tmp.
        fd, temporary = tempfile.mkstemp(prefix='.deck-history-', dir=os.path.dirname(path))
        try:
            with os.fdopen(fd, 'w', encoding='utf8') as target:
                tiers = [list(rows) for rows in self.rows]
                for i, b in enumerate(self.pending):
                    if b:
                        tiers[i + 1].append([b[4], round(b[1] / b[3]), round(b[2] / b[3])])
                json.dump({'version': 1, 'tiers': tiers}, target, separators=(',', ':'))
            os.replace(temporary, path)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)
