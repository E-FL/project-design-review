"""Exercise client installation, clean generation and immutable demo evidence."""
from pathlib import Path
import hashlib
import json
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class PackageTests(unittest.TestCase):
    def run_script(self, name, *args, success=True):
        result = subprocess.run([sys.executable, str(ROOT/'scripts'/name), *map(str, args)], capture_output=True, text=True)
        self.assertEqual(result.returncode == 0, success, result.stdout + result.stderr)
        return result

    def test_install_both_complete_and_refuse_overwrite(self):
        with tempfile.TemporaryDirectory() as folder:
            self.run_script('install_skill.py', '--client', 'both', '--home', folder)
            for directory in ['.agents', '.claude']:
                skill = Path(folder)/directory/'skills/project-design-review'
                self.assertIn('name: project-design-review', (skill/'SKILL.md').read_text(encoding='utf-8'))
                self.assertTrue((skill/'assets/comparator/review-worker.mjs').exists())
            marker = Path(folder)/'.claude/skills/project-design-review/local-note.txt'
            marker.write_text('keep')
            self.run_script('install_skill.py', '--client', 'both', '--home', folder, success=False)
            self.assertEqual(marker.read_text(), 'keep')

    def test_full_demo_has_correct_details_and_no_worker_credentials(self):
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder)/'demo'
            self.run_script('create_demo.py', target, '--mode', 'full')
            self.assertIn('"reviewMode": "full"', (target/'review-data.js').read_text(encoding='utf-8'))
            self.assertFalse((target/'.review-worker-token').exists())
            self.assertFalse((target/'feedback/issues.json').exists())
            notes = json.loads((target/'feedback/notes.json').read_text(encoding='utf-8'))
            detail = json.loads((target/'review-details/P01-r3-v1.json').read_text(encoding='utf-8'))
            self.assertEqual(notes['records'][detail['key']]['version'], detail['feedbackVersion'])
            self.assertEqual(len(detail['elements']), 4)
            self.run_script('create_demo.py', target, success=False)

    def test_preserved_demo_hashes_and_assets(self):
        demo = ROOT/'examples/morrow'
        registry = json.loads((demo/'review-revisions.json').read_text(encoding='utf-8'))
        for page, entries in registry['pages'].items():
            self.assertEqual([e['revision'] for e in entries], ['r1', 'r2', 'r3'])
            for entry in entries:
                self.assertTrue((demo/entry['contentFile']).exists(), page)
                for view in entry['views']:
                    self.assertTrue((demo/view['current']).exists(), page)
                    self.assertTrue((demo/view['proposed']).exists(), page)
                for filename, expected in entry.get('hashes', {}).items():
                    self.assertEqual(hashlib.sha256((demo/filename).read_bytes()).hexdigest(), expected, filename)


if __name__ == '__main__':
    unittest.main()
