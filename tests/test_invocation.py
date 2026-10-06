"""Verify prompt-resolved setup is remembered without damaging review evidence."""
from pathlib import Path
import json
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
HELPER = ROOT/'skills/project-design-review/scripts/configure_review.py'


class InvocationTests(unittest.TestCase):
    def configure(self, workspace, details=None, *options, success=True):
        command = [sys.executable, str(HELPER), '--workspace', str(workspace), *options]
        if details is not None:
            command.append('--stdin')
        result = subprocess.run(command, input=json.dumps(details) if details is not None else None, encoding='utf-8', capture_output=True)
        self.assertEqual(result.returncode == 0, success, result.stdout + result.stderr)
        return json.loads(result.stdout) if success else result.stderr

    def profile(self, workspace):
        return json.loads((Path(workspace)/'.design-review/project.json').read_text(encoding='utf-8'))

    def details(self):
        return {'project':{'id':'morrow','title':'Morrow','products':[{'id':'provider','title':'Provider','platforms':['android','ios','pwa']},{'id':'customer','title':'Customer','platforms':['pwa']}]},'reviewMode':'full','reviewLanguage':'he','runtime':{'port':5248}}

    def test_initial_details_and_resume_are_persistent(self):
        with tempfile.TemporaryDirectory() as workspace:
            first = self.configure(workspace, self.details())
            self.assertTrue(first['created'])
            self.assertEqual(first['products'], ['Provider', 'Customer'])
            profile = self.profile(workspace)
            self.assertEqual(profile['config']['direction'], 'rtl')
            self.assertEqual(profile['config']['project']['products'][0]['platforms'], ['android','ios','pwa'])
            self.assertTrue(all(not p['views'] for p in profile['config']['pages']))
            resumed = self.configure(workspace)
            self.assertEqual(resumed['board'], first['board'])
            self.assertEqual(resumed['version'], 1)
            self.assertEqual(resumed['language'], 'he')
            self.assertEqual(resumed['mode'], 'full')
            self.assertEqual(resumed['port'], 5248)

    def test_partial_override_preserves_evidence_and_agent_inventory_updates(self):
        with tempfile.TemporaryDirectory() as workspace:
            first = self.configure(workspace, self.details())
            board = Path(first['board'])
            fixtures = {'feedback/notes.json':'{"keep":"raw feedback"}', 'captures/old.png':'original capture', 'review-revisions.json':'{"keep":"immutable history"}'}
            for name, value in fixtures.items():
                path = board/name
                path.parent.mkdir(exist_ok=True)
                path.write_text(value, encoding='utf-8')
            data = self.profile(workspace)['config']
            data['pages'][0]['externalSources'] = [{'id':'reference','label':'Inspected fictional source','views':[]}]
            (board/'review-data.js').write_text('window.reviewConfig='+json.dumps(data)+';', encoding='utf-8')
            changed = self.configure(workspace, {'reviewMode':'brief'}, '--expected-version', '1')
            profile = self.profile(workspace)
            self.assertEqual(changed['version'], 2)
            self.assertEqual(profile['config']['reviewLanguage'], 'he')
            self.assertEqual(len(profile['config']['project']['products']), 2)
            self.assertEqual(profile['config']['pages'][0]['externalSources'][0]['id'], 'reference')
            self.assertEqual(json.loads((Path(workspace)/'.design-review/history/project-v1.json').read_text(encoding='utf-8'))['config']['reviewMode'], 'full')
            for name, value in fixtures.items():
                self.assertEqual((board/name).read_text(encoding='utf-8'), value)

    def test_stale_update_and_identity_change_cannot_overwrite(self):
        with tempfile.TemporaryDirectory() as workspace:
            self.configure(workspace, self.details())
            before = self.profile(workspace)
            error = self.configure(workspace, {'reviewMode':'brief'}, '--expected-version', '0', success=False)
            self.assertIn('version conflict', error)
            self.configure(workspace, {'project':{'id':'another'}}, success=False)
            self.assertEqual(self.profile(workspace), before)
            self.assertFalse((Path(workspace)/'.design-review/setup.lock').exists())

    def test_workspace_isolation_and_product_removal_guards(self):
        with tempfile.TemporaryDirectory() as root:
            first, second = Path(root)/'first', Path(root)/'second'
            self.configure(first, self.details())
            self.configure(second, {'project':{'id':'other','title':'Other','products':['Store']},'reviewMode':'brief','reviewLanguage':'en'})
            self.assertEqual(self.configure(first)['language'], 'he')
            self.assertEqual(self.configure(second)['project'], 'Other')
            self.configure(first, {'project':{'products':[{'id':'provider','title':'Provider'}]}}, success=False)
            self.assertEqual(len(self.profile(first)['config']['project']['products']), 2)

    def test_existing_board_is_adopted_only_explicitly_and_as_data(self):
        with tempfile.TemporaryDirectory() as root:
            workspace = Path(root)/'project'
            initial = self.configure(workspace, self.details())
            board = Path(initial['board'])
            adoption = Path(root)/'adoption'
            adoption.mkdir()
            import shutil
            shutil.copytree(board, adoption/'existing')
            self.configure(adoption, None, '--board','existing',success=False)
            result = self.configure(adoption, None, '--board','existing','--adopt')
            self.assertEqual(result['project'], 'Morrow')
            self.assertEqual(result['products'], ['Provider','Customer'])
            unsafe = Path(root)/'unsafe'
            unsafe.mkdir()
            shutil.copytree(board, unsafe/'existing')
            (unsafe/'existing/review-data.js').write_text('window.reviewConfig=runUntrustedCode();')
            error = self.configure(unsafe, None, '--board','existing','--adopt',success=False)
            self.assertIn('without executing', error)
            self.assertFalse((unsafe/'.design-review/project.json').exists())

    def test_outside_board_invalid_mode_and_concurrent_update_are_rejected(self):
        with tempfile.TemporaryDirectory() as root:
            workspace = Path(root)/'project'
            self.configure(workspace, self.details(), '--board','../outside',success=False)
            self.assertFalse((Path(root)/'outside').exists())
            self.configure(workspace, {'reviewMode':'unknown'}, success=False)
            self.assertFalse((workspace/'design-review').exists())
            (workspace/'.design-review/setup.lock').write_text('another writer')
            self.configure(workspace, self.details(), success=False)
            self.assertEqual((workspace/'.design-review/setup.lock').read_text(), 'another writer')

    def test_unicode_invocation_and_language_override_round_trip(self):
        with tempfile.TemporaryDirectory() as workspace:
            details = {'project':{'id':'rtl-demo','title':'סקירת עיצוב','products':[{'id':'provider','title':'ספק'}]},'reviewLanguage':'he'}
            initial = self.configure(workspace, details)
            self.assertEqual(initial['project'], 'סקירת עיצוב')
            self.assertEqual(self.configure(workspace)['products'], ['ספק'])
            self.configure(workspace, {'reviewLanguage':'en'}, '--expected-version','1')
            self.assertEqual(self.profile(workspace)['config']['direction'], 'ltr')
            self.assertEqual(self.profile(workspace)['config']['project']['title'], 'סקירת עיצוב')


if __name__ == '__main__':
    unittest.main()
