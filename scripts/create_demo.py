"""Create a runnable fictional review without copying private review state."""
from pathlib import Path
import argparse
import json
import shutil
import subprocess
import sys


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('destination', type=Path)
    parser.add_argument('--mode', choices=['brief', 'full'], default='brief')
    args = parser.parse_args()
    repo = Path(__file__).resolve().parents[1]
    target = args.destination.expanduser().resolve()
    if target.exists():
        parser.error('Destination exists; choose a new folder to preserve existing reviews.')
    subprocess.run([sys.executable, str(repo/'skills/project-design-review/scripts/create_review.py'), str(target), '--mode', args.mode], check=True)
    example = repo/'examples/morrow'
    for filename in ['review-data.js', 'review-revisions.json']:
        shutil.copy2(example/filename, target/filename)
    config = target/'review-data.js'
    config.write_text(config.read_text(encoding='utf-8').replace('"reviewMode": "brief"', f'"reviewMode": "{args.mode}"'), encoding='utf-8')
    for directory in ['captures', 'sources', 'revisions']:
        if (example/directory).exists():
            shutil.copytree(example/directory, target/directory)
    seed = json.loads((example/'demo-seed.json').read_text(encoding='utf-8'))
    record = seed['feedback']
    (target/'feedback').mkdir(exist_ok=True)
    (target/'feedback/notes.json').write_text(json.dumps({'records':{record['key']:{'version':record['version'],'data':record['data']}}}, ensure_ascii=False, indent=2), encoding='utf-8')
    (target/'review-details').mkdir(exist_ok=True)
    details = seed['details']
    (target/'review-details'/f"{details['key']}-v{details['feedbackVersion']}.json").write_text(json.dumps(details, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Fictional demo ready: {target}\nStart node review-server.mjs there. Default URL: http://127.0.0.1:5217/')


if __name__ == '__main__':
    main()
