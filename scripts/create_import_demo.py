"""Build a fictional two-artboard canvas and import each screen into its page."""
from pathlib import Path
import argparse
import json
import subprocess
import sys
from PIL import Image, ImageDraw

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'skills/project-design-review/scripts'))
from configure_review import configure, read_config
from import_design import import_design


def create(destination, port=5217):
    destination = Path(destination).expanduser().resolve()
    if destination.exists():
        raise ValueError('Destination exists; use a new folder to preserve reviews.')
    destination.mkdir(parents=True)
    board = destination/'board'
    subprocess.run([sys.executable, str(ROOT/'scripts/create_demo.py'), str(board)], check=True, capture_output=True)
    setup = configure(destination, {'runtime':{'port':port}, 'designGeneration':{'provider':'external'}}, board_path='board', adopt=True)
    config = read_config(board)
    registry = json.loads((board/'review-revisions.json').read_text(encoding='utf-8'))
    axes = {'viewport':'mobile','platform':'pwa','language':'en','theme':'light','variant':'Default'}
    artboards = []
    for page_id in ['P01','C01']:
        page = next(p for p in config['pages'] if p['id'] == page_id)
        record = registry['pages'][page_id][-1]
        view = next(v for v in record['views'] if all(v.get(k, 'Default' if k == 'variant' else None) == value for k, value in axes.items()))
        with Image.open(board/view['proposed']) as source:
            artboards.append((page, source.convert('RGB')))
    padding, gap, header = 48, 48, 104
    canvas = Image.new('RGB', (padding*2+gap+sum(image.width for _, image in artboards), header+padding+max(image.height for _, image in artboards)), '#102b2c')
    draw = ImageDraw.Draw(canvas)
    draw.text((padding,24), 'FICTIONAL MORROW / MULTI-SCREEN DESIGN EXPORT', fill='#c8f5d4')
    draw.text((padding,45), 'Extraction demonstration. No remote design service was called.', fill='#c6d3d0')
    x, screens = padding, []
    for page, image in artboards:
        draw.text((x,header-24), page['id']+' / '+page['title'], fill='#ffffff')
        canvas.paste(image, (x,header))
        screens.append({'id':page['id'].lower()+'-mobile', 'pageId':page['id'], 'file':'exports/two-artboard-canvas.png',
                        'artboardId':'fictional-'+page['id'], 'artboardTitle':page['title'], **axes,
                        'crop':{'x':x,'y':header,'width':image.width,'height':image.height},
                        'note':'Fictional import demonstration: this complete screen was extracted from the two-artboard canvas.'})
        x += image.width+gap
    (destination/'exports').mkdir()
    canvas.save(destination/'exports/two-artboard-canvas.png')
    manifest = {'schemaVersion':1, 'batchId':'fictional-canvas-1', 'provider':'Fixture', 'label':'Imported alternative · fictional demo',
                'evidence':'simulation', 'provenance':'Fictional Morrow revision artboards assembled for exact extraction testing; no provider generation claim.', 'screens':screens}
    (destination/'exports/import-manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    return import_design(destination, manifest, setup['version'])


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('destination', type=Path)
    parser.add_argument('--port', type=int, default=5217)
    args = parser.parse_args()
    try:
        print(json.dumps(create(args.destination, args.port), ensure_ascii=False))
    except (ValueError, OSError, KeyError, TypeError, StopIteration) as error:
        parser.error(str(error))


if __name__ == '__main__':
    main()
