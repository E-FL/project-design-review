"""Check portable skill resources and publication boundaries using stdlib only."""
from pathlib import Path
import json
import re

root = Path(__file__).resolve().parents[1]
skill = root/'skills/project-design-review'
source = (skill/'SKILL.md').read_text(encoding='utf-8')
assert source.startswith('---\nname: project-design-review\n')
assert 'description:' in source and 'Arik Aizikovich' in source
for path in skill.rglob('*'):
    if not path.is_file():
        continue
    assert path.name != '.review-worker-token'
    assert '__pycache__' not in path.parts
    if path.suffix in ['.md','.js','.mjs','.py','.html','.json','.yaml','.css']:
        text = path.read_text(encoding='utf-8')
        assert not re.search(r'Consergio|AryaPlatform|C:[/\\]Users|eflas', text, re.I), f'Private reference: {path}'
    if path.suffix == '.md':
        for link in re.findall(r'\]\(([^)]+)\)', path.read_text(encoding='utf-8')):
            if not link.startswith(('http:', 'https:', '#')):
                assert (path.parent/link.split('#')[0]).exists(), f'Missing {path}: {link}'
    if path.suffix == '.json':
        json.loads(path.read_text(encoding='utf-8'))
print('Portable skill metadata, references and publication boundaries verified.')
