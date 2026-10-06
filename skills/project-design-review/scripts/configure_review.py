"""Resolve invocation details into a remembered project review; run by the agent."""
from pathlib import Path
from datetime import datetime, timezone
import argparse
import copy
import json
import os
import re
import shutil
import sys
import tempfile
from urllib.parse import urlencode

SOURCE = Path(__file__).resolve().parents[1] / 'assets' / 'comparator'
ID = re.compile(r'^[a-zA-Z0-9][a-zA-Z0-9_-]{0,59}$')
LANGUAGE = re.compile(r'^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$')


def slug(text, fallback):
    return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')[:60] or fallback


def atomic_text(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix='.' + path.name + '-', dir=path.parent)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8', newline='\n') as output:
            output.write(text)
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def within(workspace, value):
    candidate = (workspace / value).resolve()
    if not candidate.is_relative_to(workspace):
        raise ValueError('The board must stay inside this project workspace.')
    return candidate


def read_config(board):
    text = (board / 'review-data.js').read_text(encoding='utf-8')
    match = re.fullmatch(r'\s*window\.reviewConfig\s*=\s*(.*?)\s*;?\s*', text, re.S)
    if not match:
        raise ValueError('This board needs agent-managed migration before adoption; its config is not plain JSON.')
    try:
        return json.loads(match.group(1).removesuffix(';'))
    except json.JSONDecodeError as error:
        raise ValueError('Adoption requires a data-only configuration. The agent must inspect and migrate this legacy board without executing its JavaScript.') from error


def validate(config):
    project = config.get('project')
    if not isinstance(project, dict) or not ID.fullmatch(str(project.get('id', ''))) or not isinstance(project.get('title'), str) or not project['title'].strip():
        raise ValueError('Project needs a stable id and a nonempty title.')
    products = project.get('products')
    if not isinstance(products, list) or not products:
        raise ValueError('Include at least one product.')
    ids = []
    for product in products:
        if not isinstance(product, dict) or not ID.fullmatch(str(product.get('id', ''))) or product['id'] == 'shared' or not isinstance(product.get('title'), str) or not product['title'].strip():
            raise ValueError('Products need unique stable ids and titles; shared is reserved.')
        ids.append(product['id'])
        for axis, allowed in [('platforms', {'android', 'ios', 'pwa'}), ('viewports', {'mobile', 'desktop'}), ('themes', {'light', 'dark'})]:
            values = product.get(axis)
            if not isinstance(values, list) or not values or not set(values).issubset(allowed):
                raise ValueError(f'{product["id"]}: invalid {axis}.')
        if not isinstance(product.get('languages'), list) or not product['languages'] or any(not LANGUAGE.fullmatch(str(lang)) for lang in product['languages']):
            raise ValueError(f'{product["id"]}: invalid screen languages.')
    if len(ids) != len(set(ids)):
        raise ValueError('Product ids must be unique.')
    if config.get('reviewMode') not in ['brief', 'full'] or not LANGUAGE.fullmatch(str(config.get('reviewLanguage', ''))):
        raise ValueError('Use brief/full and a valid review language.')
    if config.get('direction') not in ['ltr', 'rtl']:
        raise ValueError('Direction must be ltr or rtl.')
    pages = config.get('pages')
    if not isinstance(pages, list):
        raise ValueError('Pages must be a list.')
    page_ids = []
    for page in pages:
        if not isinstance(page, dict) or not ID.fullmatch(str(page.get('id', ''))) or page.get('productId') not in ids + ['shared']:
            raise ValueError('Each page needs a stable id and an existing productId (or shared).')
        if not isinstance(page.get('title'), str) or not re.fullmatch(r'r[1-9][0-9]*', str(page.get('revision', ''))):
            raise ValueError('Each page needs a title and a revision such as r1.')
        page_ids.append(page['id'])
    if len(page_ids) != len(set(page_ids)):
        raise ValueError('Page ids must be unique.')


def merge_config(current, details, workspace):
    if not isinstance(details, dict):
        raise ValueError('Invocation details must be a JSON object.')
    config = copy.deepcopy(current or {})
    project = config.setdefault('project', {'id': slug(workspace.name, 'project'), 'title': workspace.name})
    incoming = details.get('project', {})
    if not isinstance(incoming, dict):
        raise ValueError('project must be an object.')
    if current and incoming.get('id', project['id']) != project['id']:
        raise ValueError('A different project id needs a separate workspace; existing review identities cannot be renamed.')
    project.update({k: v for k, v in incoming.items() if k != 'products'})
    existing_products = {p['id']: p for p in project.get('products', [])}
    if 'products' in incoming:
        if not isinstance(incoming['products'], list):
            raise ValueError('products must be a list.')
        normalized = []
        for index, item in enumerate(incoming['products']):
            if isinstance(item, str):
                item = {'id': slug(item, f'product-{index+1}'), 'title': item}
            if not isinstance(item, dict):
                raise ValueError('Each product must be a name or an object.')
            item = dict(item)
            item.setdefault('id', slug(str(item.get('title', '')), f'product-{index+1}'))
            baseline = copy.deepcopy(existing_products.get(item['id'], {}))
            baseline.update(item)
            normalized.append(baseline)
        project['products'] = normalized
    project.setdefault('products', [{'id': 'product', 'title': project['title']}])
    for product in project['products']:
        product.setdefault('viewports', ['mobile', 'desktop'])
        product.setdefault('platforms', ['pwa'])
        product.setdefault('languages', ['en'])
        product.setdefault('themes', ['light', 'dark'])
    for key, value in details.items():
        if key not in ['project', 'runtime', 'schemaVersion']:
            config[key] = value
    config.setdefault('reviewMode', 'brief')
    config.setdefault('reviewLanguage', 'en')
    if 'direction' not in config or ('reviewLanguage' in details and 'direction' not in details):
        config['direction'] = 'rtl' if re.match(r'^(he|ar|fa|ur)(-|$)', config['reviewLanguage']) else 'ltr'
    config.setdefault('pages', [])
    if not current and 'pages' not in details:
        for index, product in enumerate(project['products']):
            config['pages'].append({'id': f'P{index+1:02}', 'productId': product['id'], 'title': product['title'], 'revision': 'r1', 'summary': 'Awaiting page inventory and visual captures.', 'provenance': 'Inventory only; no visual proposal has been prepared.', 'parts': [], 'views': [], 'externalSources': []})
    validate(config)
    return config


def configure(workspace, details=None, board_path=None, adopt=False, expected_version=None):
    workspace = Path(workspace).expanduser().resolve()
    workspace.mkdir(parents=True, exist_ok=True)
    profile_dir = within(workspace, '.design-review')
    profile_dir.mkdir(exist_ok=True)
    profile_file = profile_dir / 'project.json'
    lock = profile_dir / 'setup.lock'
    try:
        descriptor = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError as error:
        raise ValueError('Another setup update is running. Read the saved profile and retry; do not overwrite it.') from error
    os.close(descriptor)
    try:
        profile = json.loads(profile_file.read_text(encoding='utf-8')) if profile_file.exists() else None
        version = profile['version'] if profile else 0
        if expected_version is not None and expected_version != version:
            raise ValueError(f'Setup version conflict: expected {expected_version}, found {version}. Reload before updating.')
        remembered = profile['board'] if profile else 'design-review'
        board = within(workspace, board_path or remembered)
        if profile and board.relative_to(workspace).as_posix() != remembered:
            raise ValueError('This project already has a canonical board. Reuse it instead of creating a competing one.')
        if profile:
            current = read_config(board)
            if current['project']['id'] != profile['config']['project']['id']:
                raise ValueError('The board belongs to another project; do not mix saved setup.')
        elif board.exists():
            if not adopt or not (board/'review-server.mjs').is_file():
                raise ValueError('The target exists. Adopt a verified review board explicitly; do not overwrite existing files.')
            current = read_config(board)
        else:
            current = None
        config = merge_config(current, details or {}, workspace)
        runtime = copy.deepcopy(profile.get('runtime', {}) if profile else {})
        changes = (details or {}).get('runtime', {})
        if not isinstance(changes, dict) or set(changes) - {'port'}:
            raise ValueError('Runtime accepts only a local review port.')
        runtime.update(changes)
        runtime.setdefault('port', 5217)
        if isinstance(runtime['port'], bool) or not isinstance(runtime['port'], int) or not 1024 <= runtime['port'] <= 65535:
            raise ValueError('Review port must be an integer between 1024 and 65535.')
        if not board.exists():
            shutil.copytree(SOURCE, board)
        new = {'schemaVersion': 1, 'version': version + 1, 'board': board.relative_to(workspace).as_posix(), 'config': config, 'runtime': runtime, 'updatedAt': datetime.now(timezone.utc).isoformat()}
        if profile and config == profile['config'] and runtime == profile.get('runtime'):
            new = profile
        else:
            # Preserve prior setup snapshots; feedback, captures and revision registry are never written here.
            if profile:
                history = profile_dir/'history'/f'project-v{version}.json'
                if history.exists():
                    if json.loads(history.read_text(encoding='utf-8')) != profile:
                        raise ValueError('A preserved setup version conflicts; stop before changing the board.')
                else:
                    atomic_text(history, json.dumps(profile, ensure_ascii=False, indent=2) + '\n')
            text = json.dumps(config, ensure_ascii=False, indent=2).replace('\u2028', '\\u2028').replace('\u2029', '\\u2029')
            atomic_text(board/'review-data.js', 'window.reviewConfig=' + text + ';\n')
            atomic_text(profile_file, json.dumps(new, ensure_ascii=False, indent=2) + '\n')
        query = urlencode({'detail': config['reviewMode']})
        return {'profile': str(profile_file), 'board': str(board), 'version': new['version'], 'project': config['project']['title'], 'products': [p['title'] for p in config['project']['products']], 'mode': config['reviewMode'], 'language': config['reviewLanguage'], 'port': runtime['port'], 'url': f'http://127.0.0.1:{runtime["port"]}/?{query}', 'created': current is None}
    finally:
        lock.unlink()


def main():
    # Invocation JSON and machine-readable output use UTF-8 on every client/OS.
    sys.stdin.reconfigure(encoding='utf-8')
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--workspace', type=Path, default=Path.cwd())
    inputs = parser.add_mutually_exclusive_group()
    inputs.add_argument('--stdin', action='store_true', help='Read agent-resolved invocation details as JSON from stdin.')
    inputs.add_argument('--input', type=Path, help='Read agent-resolved JSON from a temporary file.')
    parser.add_argument('--board', help='New relative board folder; defaults to design-review or the remembered board.')
    parser.add_argument('--adopt', action='store_true', help='Explicitly adopt a verified existing data-only review board.')
    parser.add_argument('--expected-version', type=int)
    parser.add_argument('--mode', choices=['brief', 'full'])
    parser.add_argument('--language')
    parser.add_argument('--project-title')
    parser.add_argument('--product', action='append', help='Product name; repeat to configure several products.')
    parser.add_argument('--port', type=int)
    parser.add_argument('--show', action='store_true', help='Read saved details without writing or starting anything.')
    args = parser.parse_args()
    try:
        if args.show:
            print((args.workspace.expanduser().resolve()/'.design-review/project.json').read_text(encoding='utf-8'))
            return
        details = json.load(sys.stdin) if args.stdin else json.loads(args.input.read_text(encoding='utf-8')) if args.input else {}
        if args.mode: details['reviewMode'] = args.mode
        if args.language: details['reviewLanguage'] = args.language
        if args.project_title: details.setdefault('project', {})['title'] = args.project_title
        if args.product: details.setdefault('project', {})['products'] = args.product
        if args.port is not None: details.setdefault('runtime', {})['port'] = args.port
        result = configure(args.workspace, details, args.board, args.adopt, args.expected_version)
        print(json.dumps(result, ensure_ascii=False))
    except (ValueError, OSError, KeyError, TypeError) as error:
        parser.error(str(error))


if __name__ == '__main__':
    main()
