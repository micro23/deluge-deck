"""Exercise persistence, bounds, downsampling and untrusted history files."""
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('speed_history', Path(__file__).resolve().parents[1] / 'plugin/deluge_deck/speed_history.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class HistoryTests(unittest.TestCase):
    def test_retention_and_rpc_bounds(self):
        h = module.SpeedHistory()
        for t in range(1, 7200001, 2000):
            h.add(t, 100, 50)
        self.assertLessEqual(len(h.rows[0]), 1802)
        self.assertTrue(all(row[0] >= h.rows[0][-1][0] - 3600000 for row in h.rows[0]))
        r = h.query(7200000, 3600000, 20)
        self.assertLessEqual(len(r['samples']), 20)
        self.assertTrue(all(row[1:] == [100, 50] for row in r['samples']))
        self.assertLessEqual(len(h.query(7200000, float('inf'), -1)['samples']), 2)

    def test_long_range_restart_and_gap(self):
        h = module.SpeedHistory()
        h.add(100000, 100, 50)
        h.add(102000, 200, 100)
        h.add(900000, 300, 150)
        with tempfile.TemporaryDirectory() as directory:
            path = os.path.join(directory, 'history.json')
            h.save(path)
            self.assertEqual(os.stat(path).st_mode & 0o777, 0o600)
            other = module.SpeedHistory()
            other.load(path, 902000)
            result = other.query(902000, 7200000, 600)
            self.assertEqual([row[0] for row in result['samples']], [102000, 900000])
            self.assertEqual(result['samples'][0][1:], [150, 75])
            self.assertGreater(result['samples'][1][0] - result['samples'][0][0], result['interval'] * 2.5)

    def test_invalid_rates_corrupt_file_and_symlink(self):
        h = module.SpeedHistory()
        h.add(1000, -1, float('nan'))
        h.add(1000, 999, 999)
        self.assertEqual(list(h.rows[0]), [[1000, 0, 0]])
        with tempfile.TemporaryDirectory() as directory:
            target = os.path.join(directory, 'target')
            link = os.path.join(directory, 'history')
            Path(target).write_text('sensitive')
            os.symlink(target, link)
            h.load(link, 2000)
            h.save(link)
            self.assertEqual(Path(target).read_text(), 'sensitive')
            self.assertFalse(os.path.islink(link))
            Path(link).write_text(json.dumps({'version': 1, 'tiers': [[[1000, 'evil', 2], [99999999, 1, 2]]]}))
            other = module.SpeedHistory()
            other.load(link, 2000)
            self.assertEqual(list(other.rows[0]), [])
            Path(link).write_text('x' * (2 * 1024 * 1024 + 1))
            with self.assertRaises(ValueError):
                other.load(link, 2000)


if __name__ == '__main__':
    unittest.main()
