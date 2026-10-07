"""Freeze a page/view design brief for the agent's available generator; does not dispatch."""
from pathlib import Path
import argparse
import hashlib
import json
import os
import re
import sys
from datetime import datetime, timezone

sys.dont_write_bytecode = True
from configure_review import within, read_config, atomic_text
from import_design import text, view_axes, view_key


def prepare(workspace, request, expected_version):
    workspace = Path(workspace).expanduser().resolve()
    if not isinstance(request, dict):
        raise ValueError('Supply an agent-resolved design request object.')
    identifier = request.get('requestId', '')
    if not re.fullmatch(r'[a-z0-9][a-z0-9_-]{0,59}', str(identifier)):
        raise ValueError('Use a unique lowercase requestId.')
    raw_request = text(request.get('request'), 'request', 20000)
    brief = text(request.get('designBrief'), 'designBrief', 30000)
    targets = request.get('targets')
    if not isinstance(targets, list) or not targets:
        raise ValueError('Include the explicitly requested page targets.')
    profile_dir = within(workspace, '.design-review')
    lock = profile_dir/'setup.lock'
    try:
        descriptor = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError as error:
        raise ValueError('A project update is running; reload before preparing this brief.') from error
    os.close(descriptor)
    try:
        profile = json.loads((profile_dir/'project.json').read_text(encoding='utf-8'))
        if profile['version'] != expected_version:
            raise ValueError('Setup version conflict. Reload before preparing the design brief.')
        config = read_config(within(workspace, profile['board']))
        if config['project']['id'] != profile['config']['project']['id']:
            raise ValueError('Board and saved project identities differ.')
        provider = config.get('designGeneration', {}).get('provider', 'auto')
        pages = {p['id']: p for p in config['pages']}
        products = {p['id']: p['title'] for p in config['project']['products']}
        seen, screens = set(), []
        board = within(workspace, profile['board'])
        for target in targets:
            page = pages.get(target.get('pageId'))
            if page is None:
                raise ValueError('Target pageId must exist in the canonical inventory.')
            views = target.get('views')
            if views is None:
                views = [v for v in page.get('views', []) if v.get('current') and v.get('kind') != 'reference']
            if not isinstance(views, list) or not views:
                raise ValueError('Capture the baseline or supply explicit target views before requesting designs.')
            for view in views:
                axes = view_axes(config, page, view)
                key = (page['id'], view_key(axes))
                if key in seen:
                    raise ValueError('Duplicate page/view target.')
                seen.add(key)
                baseline = next((v for v in page.get('views', []) if v.get('current') and v.get('kind') != 'reference' and view_key(view_axes(config, page, v)) == view_key(axes)), None)
                evidence = None
                if baseline:
                    path = within(board, baseline['current'])
                    evidence = {'image': path.relative_to(workspace).as_posix(), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                                'provenance': baseline.get('currentNote', baseline.get('note', page.get('provenance', '')))}
                screen_id = 'screen-' + hashlib.sha256(json.dumps(key, ensure_ascii=False).encode()).hexdigest()[:16]
                screens.append({'id': screen_id, 'pageId': page['id'], 'pageTitle': page['title'], 'productId': page['productId'],
                                'productTitle': products.get(page['productId'], 'Shared'), 'reviewRevision': page['revision'],
                                **axes, 'baseline': evidence,
                                'artboardName': page['id'] + ' · ' + ' · '.join(axes.values())})
        if len(screens) > 100:
            raise ValueError('Split the request into bounded passes of at most 100 views.')
        output = profile_dir/'design-requests'/f'{identifier}.json'
        if output.exists():
            raise ValueError('This design request is preserved; use a new requestId for another pass.')
        plan = {'schemaVersion': 1, 'requestId': identifier, 'status': 'prepared', 'dispatch': 'agent-required',
                'provider': provider, 'designProjectUrl': config.get('designGeneration', {}).get('projectUrl', ''),
                'projectId': config['project']['id'], 'projectTitle': config['project']['title'], 'setupVersion': profile['version'],
                'reviewLanguage': config['reviewLanguage'], 'reviewMode': config['reviewMode'],
                'request': raw_request, 'designBrief': brief, 'screens': screens,
                'exportContract': {'separateArtboards': True, 'preserveFullPage': True, 'includeEditableSourceWhenAvailable': True,
                                   'targetEvidence': 'visual-design-only'},
                'preparedAt': datetime.now(timezone.utc).isoformat()}
        atomic_text(output, json.dumps(plan, ensure_ascii=False, indent=2) + '\n')
        return {'requestFile': str(output), 'status': 'prepared', 'provider': provider, 'screens': screens}
    finally:
        lock.unlink()


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
        request = json.load(sys.stdin) if args.stdin else json.loads(args.input.read_text(encoding='utf-8'))
        print(json.dumps(prepare(args.workspace, request, args.expected_version), ensure_ascii=False))
    except (ValueError, OSError, KeyError, TypeError, AttributeError) as error:
        parser.error(str(error))


if __name__ == '__main__':
    main()
