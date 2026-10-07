"""Verify exact artboard extraction, source preservation and scoped generation briefs."""
from pathlib import Path
import hashlib
import json
import sys
import tempfile
import unittest
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.dont_write_bytecode = True
sys.path.insert(0, str(ROOT/'skills/project-design-review/scripts'))
from configure_review import configure, read_config
from import_design import import_design
from prepare_design_request import prepare


class DesignImportTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.workspace = Path(self.temporary.name)
        self.axes = {'viewport':'mobile','platform':'pwa','language':'en','theme':'light','variant':'Default'}
        pages = [{'id':page, 'productId':'provider', 'title':page, 'revision':'r1', 'views':[{'id':'baseline', **self.axes, 'current':f'captures/{page}.png', 'proposed':f'captures/{page}.png'}], 'externalSources':[]} for page in ['P01','P02']]
        result = configure(self.workspace, {'project':{'id':'fictional','title':'Fictional','products':[{'id':'provider','title':'Provider'}]}, 'pages':pages,
                         'designGeneration':{'provider':'stitch','projectUrl':'https://stitch.withgoogle.com/projects/fictional'}})
        self.board = Path(result['board'])
        (self.board/'captures').mkdir(exist_ok=True)
        for page in pages:
            Image.new('RGB', (8, 10), '#cccccc').save(self.board/page['views'][0]['current'])
        (self.board/'feedback').mkdir()
        (self.board/'feedback/notes.json').write_text('{"notes":"keep"}')
        self.registry_before = (self.board/'review-revisions.json').read_bytes()
        (self.workspace/'exports').mkdir()
        self.canvas = Image.new('RGB', (40, 30), '#333333')
        for x in range(40):
            for y in range(30):
                self.canvas.putpixel((x,y), (x*6, y*8, (x+y)*3))
        self.canvas.save(self.workspace/'exports/canvas.png')

    def manifest(self, batch='pass-1'):
        return {'schemaVersion':1, 'batchId':batch, 'provider':'Fixture', 'label':'Isolated mock alternatives', 'evidence':'simulation', 'provenance':'Inspected synthetic contact sheet.',
                'screens':[{'id':'first', 'pageId':'P01', 'file':'exports/canvas.png', 'crop':{'x':2,'y':3,'width':8,'height':10}, **self.axes},
                           {'id':'second', 'pageId':'P02', 'file':'exports/canvas.png', 'crop':{'x':22,'y':3,'width':8,'height':10}, **self.axes}]}

    def profile(self):
        return json.loads((self.workspace/'.design-review/project.json').read_text())

    def test_crops_match_pixels_and_preserve_originals_feedback_and_history(self):
        result = import_design(self.workspace, self.manifest(), 1)
        config = read_config(self.board)
        self.assertEqual(result['version'], 2)
        self.assertIn('right=external%3Apass-1', result['url'])
        self.assertTrue(result['url'].endswith('#P01'))
        for screen, x in zip(result['screens'], [2,22]):
            with Image.open(self.board/screen['image']) as extracted:
                self.assertEqual(extracted.size, (8,10))
                self.assertEqual(extracted.tobytes(), self.canvas.crop((x,3,x+8,13)).tobytes())
            original = self.board/screen['extraction']['originalImage']
            self.assertEqual(original.read_bytes(), (self.workspace/'exports/canvas.png').read_bytes())
            self.assertEqual(screen['extraction']['originalHash'], hashlib.sha256(original.read_bytes()).hexdigest())
        self.assertEqual(config['pages'][0]['defaultComparison'], {'left':'current','right':'external:pass-1'})
        self.assertEqual(config['pages'][0]['defaultViewport'], 'mobile')
        self.assertEqual(config['pages'][0]['defaultPlatform'], 'pwa')
        self.assertEqual(config['pages'][0]['defaultVariant'], 'Default')
        self.assertEqual((self.board/'feedback/notes.json').read_text(), '{"notes":"keep"}')
        self.assertEqual((self.board/'review-revisions.json').read_bytes(), self.registry_before)
        self.assertEqual(config['designGeneration']['provider'], 'stitch')
        self.assertEqual(self.profile()['config'], config)

    def test_new_pass_has_unique_source_images_and_cannot_replace_old_batch(self):
        first = import_design(self.workspace, self.manifest(), 1)
        original = (self.board/first['screens'][0]['image']).read_bytes()
        with self.assertRaisesRegex(ValueError, 'already exists'):
            import_design(self.workspace, self.manifest(), 2)
        second = import_design(self.workspace, self.manifest('pass-2'), 2)
        self.assertNotEqual(first['screens'][0]['image'], second['screens'][0]['image'])
        self.assertEqual((self.board/first['screens'][0]['image']).read_bytes(), original)
        self.assertEqual(len(read_config(self.board)['pages'][0]['externalSources']), 2)

    def test_invalid_mapping_bounds_paths_axes_and_duplicates_write_nothing(self):
        invalid = []
        item = self.manifest(); item['screens'][0]['crop']['width'] = 999; invalid.append(item)
        item = self.manifest(); item['screens'][0]['file'] = '../outside.png'; invalid.append(item)
        item = self.manifest(); item['screens'][0]['pageId'] = 'UNKNOWN'; invalid.append(item)
        item = self.manifest(); item['screens'][0]['platform'] = 'ios'; invalid.append(item)
        item = self.manifest(); item['screens'][0].pop('theme'); invalid.append(item)
        item = self.manifest(); item['screens'][1]['pageId'] = 'P01'; invalid.append(item)
        item = self.manifest(); item['sourceUrl'] = 'javascript:alert(1)'; invalid.append(item)
        before = (self.board/'review-data.js').read_bytes()
        for manifest in invalid:
            with self.subTest(manifest=manifest), self.assertRaises((ValueError, OSError)):
                import_design(self.workspace, manifest, 1)
            self.assertEqual((self.board/'review-data.js').read_bytes(), before)
            self.assertFalse((self.board/'imports/pass-1').exists())
        self.assertEqual(self.profile()['version'], 1)

    def test_stale_import_is_rejected_before_any_assets_are_created(self):
        configure(self.workspace, {'reviewMode':'full'}, expected_version=1)
        with self.assertRaisesRegex(ValueError, 'version conflict'):
            import_design(self.workspace, self.manifest(), 1)
        self.assertFalse((self.board/'imports').exists())

    def test_individual_artboard_import_has_no_resize_and_original_jpeg_bytes(self):
        source = Image.new('RGB', (17,21), '#8899aa')
        source.save(self.workspace/'exports/artboard.jpg')
        manifest = self.manifest()
        manifest['screens'] = [manifest['screens'][0]]
        screen = manifest['screens'][0]
        screen['file'] = 'exports/artboard.jpg'
        screen.pop('crop')
        result = import_design(self.workspace, manifest, 1)
        imported = result['screens'][0]
        with Image.open(self.workspace/screen['file']) as original, Image.open(self.board/imported['image']) as isolated:
            self.assertEqual(isolated.tobytes(), original.tobytes())
        self.assertEqual((self.board/imported['extraction']['originalImage']).read_bytes(), (self.workspace/screen['file']).read_bytes())

    def test_generator_preference_resume_and_scoped_brief_do_not_dispatch(self):
        self.assertEqual(configure(self.workspace)['version'], 1)
        request = {'requestId':'home-1','request':'Make home calmer.','designBrief':'Keep primary actions. Use a clearer hierarchy.', 'targets':[{'pageId':'P01','views':[self.axes]}]}
        result = prepare(self.workspace, request, 1)
        plan = json.loads(Path(result['requestFile']).read_text())
        self.assertEqual(plan['provider'], 'stitch')
        self.assertEqual(plan['status'], 'prepared')
        self.assertEqual(plan['dispatch'], 'agent-required')
        self.assertEqual([s['pageId'] for s in plan['screens']], ['P01'])
        self.assertEqual(plan['screens'][0]['baseline']['sha256'], hashlib.sha256((self.board/'captures/P01.png').read_bytes()).hexdigest())
        self.assertFalse((self.board/'feedback/issues.json').exists())
        with self.assertRaisesRegex(ValueError, 'preserved'):
            prepare(self.workspace, request, 1)
        configure(self.workspace, {'designGeneration':{'provider':'claude-design'}}, expected_version=1)
        self.assertEqual(self.profile()['config']['designGeneration'], {'provider':'claude-design'})
        configure(self.workspace, {'reviewMode':'full'}, expected_version=2)
        self.assertEqual(self.profile()['config']['designGeneration']['provider'], 'claude-design')

    def test_explicit_uncaptured_state_is_not_given_a_fabricated_baseline(self):
        axes = {**self.axes, 'variant':'Error state'}
        request = {'requestId':'error-1','request':'Design an error state.','designBrief':'Retain a retry action.', 'targets':[{'pageId':'P02','views':[axes]}]}
        result = prepare(self.workspace, request, 1)
        self.assertIsNone(result['screens'][0]['baseline'])
        self.assertEqual(result['screens'][0]['variant'], 'Error state')

    def test_custom_provider_is_remembered_but_credentials_are_rejected(self):
        configure(self.workspace, {'designGeneration':{'provider':'figma'}}, expected_version=1)
        self.assertEqual(self.profile()['config']['designGeneration'], {'provider':'figma'})
        before = self.profile()
        with self.assertRaisesRegex(ValueError, 'credentials'):
            configure(self.workspace, {'designGeneration':{'apiKey':'dummy-disallowed-field'}}, expected_version=2)
        self.assertEqual(self.profile(), before)


if __name__ == '__main__':
    unittest.main()
