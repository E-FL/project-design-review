"""Import inspected design artboards or exact canvas crops into the canonical board."""
from pathlib import Path
import argparse
import copy
import hashlib
import io
import json
import os
import re
import shutil
import sys
import tempfile
from urllib.parse import urlencode, urlsplit

sys.dont_write_bytecode = True
from configure_review import configure, within, LANGUAGE, atomic_text


def sha(data):
    return hashlib.sha256(data).hexdigest()


def text(value, name, limit=1000):
    if not isinstance(value, str) or not value.strip() or len(value) > limit:
        raise ValueError(f'{name} must be nonempty text, at most {limit} characters.')
    return value


def https_url(value):
    if not value:
        return ''
    text(value, 'sourceUrl', 2000)
    parsed = urlsplit(value)
    if parsed.scheme != 'https' or not parsed.netloc or parsed.username or parsed.password:
        raise ValueError('Source URLs must be HTTPS without embedded credentials.')
    return value


def view_axes(config, page, view):
    """Keep the actual target axes explicit; never infer a platform from a provider."""
    result = {key: view.get(key) for key in ['viewport', 'platform', 'language', 'theme', 'variant']}
    if result['viewport'] not in ['mobile', 'desktop'] or result['platform'] not in ['android', 'ios', 'pwa'] or result['theme'] not in ['light', 'dark'] or not LANGUAGE.fullmatch(str(result['language'])):
        raise ValueError('Every screen needs explicit viewport, platform, language, theme and variant.')
    text(result['variant'], 'variant', 80)
    products = config['project']['products']
    product = next((p for p in products if p['id'] == page['productId']), None)
    for key, inventory_key in [('viewport', 'viewports'), ('platform', 'platforms'), ('language', 'languages'), ('theme', 'themes')]:
        allowed = page.get(inventory_key) or (product.get(inventory_key) if product else list({v for p in products for v in p[inventory_key]}))
        if result[key] not in allowed:
            raise ValueError(f'{page["id"]}: {key} {result[key]} is outside the product/page inventory. Update the authorized inventory first.')
    return result


def view_key(view):
    # Desktop comparisons do not select a mobile platform; two such views collide.
    return tuple(view[k] if k != 'platform' or view['viewport'] == 'mobile' else '*' for k in ['viewport', 'platform', 'language', 'theme', 'variant'])


def import_design(workspace, manifest, expected_version):
    workspace = Path(workspace).expanduser().resolve()
    if not isinstance(manifest, dict) or manifest.get('schemaVersion') != 1:
        raise ValueError('Use a schemaVersion 1 design-import manifest.')
    batch = manifest.get('batchId', '')
    if not re.fullmatch(r'[a-z0-9][a-z0-9_-]{0,59}', str(batch)):
        raise ValueError('batchId must be a unique lowercase id.')
    provider = text(manifest.get('provider'), 'provider', 100)
    label = text(manifest.get('label'), 'label', 200)
    provenance = text(manifest.get('provenance'), 'provenance', 2000)
    evidence = manifest.get('evidence')
    if evidence not in ['generated', 'imported', 'simulation']:
        raise ValueError('Evidence must be generated, imported or simulation, based on what was actually inspected.')
    source_url = https_url(manifest.get('sourceUrl'))
    screens = manifest.get('screens')
    if not isinstance(screens, list) or not screens or len(screens) > 100:
        raise ValueError('Include 1 to 100 mapped screens.')
    if expected_version is None:
        raise ValueError('Read the saved profile and supply expected_version for this import.')
    try:
        from PIL import Image
    except ImportError as error:
        raise ValueError('Artboard import needs Pillow. Install the bundled scripts/requirements-design.txt in the agent Python environment.') from error
    imported = []

    def transform(config, profile):
        if config is None or profile is None:
            raise ValueError('Create or adopt the canonical project board before importing designs.')
        board = within(workspace, profile['board'])
        destination = within(board, 'imports/' + batch)
        if destination.exists():
            raise ValueError('This import batch already exists. Use a new batchId to preserve its images and flags.')
        pages = copy.deepcopy(config['pages'])
        by_id = {p['id']: p for p in pages}
        if any(s.get('id') == batch for p in pages for s in p.get('externalSources', [])):
            raise ValueError('This source id is already preserved; use a new batchId.')
        assets, seen_ids, seen_views, groups = {}, set(), set(), {}
        # Validate/decode everything before creating files or changing configuration.
        for screen in screens:
            if not isinstance(screen, dict):
                raise ValueError('Each screen must be an object.')
            identifier = screen.get('id', '')
            if not re.fullmatch(r'[a-z0-9][a-z0-9_-]{0,59}', str(identifier)) or identifier in seen_ids:
                raise ValueError('Screen ids must be unique lowercase ids.')
            seen_ids.add(identifier)
            page = by_id.get(screen.get('pageId'))
            if page is None:
                raise ValueError('Every imported screen must map to an existing pageId.')
            axes = view_axes(config, page, screen)
            key = (page['id'], view_key(axes))
            if key in seen_views:
                raise ValueError('Duplicate page/view combination. Put another alternative in a separate batch.')
            seen_views.add(key)
            path_value = text(screen.get('file'), 'file', 1000)
            if Path(path_value).is_absolute():
                raise ValueError('Stage source files inside the workspace and use a relative file path.')
            input_file = within(workspace, path_value)
            raw = input_file.read_bytes()
            original_hash = sha(raw)
            with Image.open(io.BytesIO(raw)) as original:
                if original.format not in ['PNG', 'JPEG', 'WEBP'] or getattr(original, 'is_animated', False):
                    raise ValueError('Import static PNG, JPEG or WebP artboards; render other exports first.')
                if original.getexif().get(274, 1) != 1:
                    raise ValueError('Render an upright export before measuring its crop bounds.')
                original.load()
                width, height = original.size
                crop = screen.get('crop', {'x': 0, 'y': 0, 'width': width, 'height': height})
                if not isinstance(crop, dict) or set(crop) != {'x', 'y', 'width', 'height'} or any(type(v) is not int for v in crop.values()):
                    raise ValueError('crop needs integer x, y, width and height in original-image pixels.')
                x, y, w, h = (crop[k] for k in ['x', 'y', 'width', 'height'])
                if x < 0 or y < 0 or w <= 0 or h <= 0 or x + w > width or y + h > height:
                    raise ValueError('Crop bounds are outside the original canvas.')
                output = io.BytesIO()
                original.crop((x, y, x+w, y+h)).save(output, format='PNG')
                extracted = output.getvalue()
                extension = {'PNG': 'png', 'JPEG': 'jpg', 'WEBP': 'webp'}[original.format]
            original_name = f'originals/{original_hash}.{extension}'
            image_name = f'screens/{identifier}.png'
            assets[original_name] = raw
            assets[image_name] = extracted
            extraction = {'originalImage': f'imports/{batch}/{original_name}', 'originalHash': original_hash,
                          'originalWidth': width, 'originalHeight': height, 'crop': crop,
                          'artboardId': text(screen.get('artboardId', identifier), 'artboardId', 200),
                          'artboardTitle': text(screen.get('artboardTitle', page['title']), 'artboardTitle', 200)}
            view = {'id': identifier, **axes, 'image': f'imports/{batch}/{image_name}', 'width': w, 'height': h,
                    'note': text(screen.get('note', provenance), 'note', 2000), 'extraction': extraction}
            groups.setdefault(page['id'], []).append(view)
            imported.append({'pageId': page['id'], 'sourceId': 'external:' + batch, **view})
        for page_id, views in groups.items():
            page = by_id[page_id]
            source = {'id': batch, 'label': label, 'provider': provider, 'evidence': evidence, 'provenance': provenance,
                      'sourceUrl': source_url, 'views': views, 'hashes': {v['image']: sha(assets[v['image'].split(f'imports/{batch}/', 1)[1]]) for v in views}}
            page.setdefault('externalSources', []).append(source)
            page['defaultComparison'] = {'left': 'current', 'right': 'external:' + batch}
            for axis in ['viewport', 'platform', 'language', 'theme', 'variant']:
                page['default' + axis.capitalize()] = views[0][axis]
        destination.parent.mkdir(parents=True, exist_ok=True)
        temporary = Path(tempfile.mkdtemp(prefix='.' + batch + '-', dir=destination.parent))
        try:
            for relative, data in assets.items():
                target = temporary / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(data)
            receipt = {'schemaVersion': 1, 'batchId': batch, 'provider': provider, 'label': label, 'evidence': evidence,
                       'provenance': provenance, 'sourceUrl': source_url, 'projectId': config['project']['id'],
                       'setupVersionBeforeImport': profile['version'], 'screens': imported}
            atomic_text(temporary/'manifest.json', json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')
            os.rename(temporary, destination)
        finally:
            if temporary.exists():
                if not temporary.resolve().is_relative_to(board.resolve()):
                    raise ValueError('Refusing to clean a staging folder outside the board.')
                shutil.rmtree(temporary)
        return {'pages': pages}

    result = configure(workspace, expected_version=expected_version, config_transform=transform)
    first = imported[0]
    query = urlencode({'detail': result['mode'], **{k: first[k] for k in ['viewport', 'platform', 'language', 'theme', 'variant']}, 'left': 'current', 'right': first['sourceId']})
    result.update({'batchId': batch, 'screens': imported, 'url': f'http://127.0.0.1:{result["port"]}/?{query}#{first["pageId"]}'})
    return result


def main():
    sys.stdin.reconfigure(encoding='utf-8')
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--workspace', type=Path, default=Path.cwd())
    inputs = parser.add_mutually_exclusive_group(required=True)
    inputs.add_argument('--stdin', action='store_true')
    inputs.add_argument('--input', type=Path)
    parser.add_argument('--expected-version', type=int, required=True)
    args = parser.parse_args()
    try:
        manifest = json.load(sys.stdin) if args.stdin else json.loads(args.input.read_text(encoding='utf-8'))
        print(json.dumps(import_design(args.workspace, manifest, args.expected_version), ensure_ascii=False))
    except (ValueError, OSError, KeyError, TypeError) as error:
        parser.error(str(error))


if __name__ == '__main__':
    main()
