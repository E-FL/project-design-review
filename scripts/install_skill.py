"""Install the complete skill for Codex, Claude Code, or both without overwriting."""
from pathlib import Path
import argparse
import shutil

SKILL_NAME = 'project-design-review'
SOURCE = Path(__file__).resolve().parents[1] / 'skills' / SKILL_NAME


def install(client, base, project=False):
    directory = '.agents' if client == 'codex' else '.claude'
    destination = base / directory / 'skills' / SKILL_NAME
    if destination.exists() or destination.is_symlink():
        raise FileExistsError(f'{destination} already exists. Preserve or move it before installing an update.')
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(SOURCE, destination)
    return destination


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--client', choices=['codex', 'claude', 'both'], required=True)
    parser.add_argument('--project', type=Path, help='Install in this project instead of your home directory.')
    parser.add_argument('--home', type=Path, default=Path.home(), help='Alternate home directory (useful for portable setups/tests).')
    args = parser.parse_args()
    clients = ['codex', 'claude'] if args.client == 'both' else [args.client]
    base = (args.project or args.home).expanduser().resolve()
    # Preflight all targets so a conflict does not leave a half-installed pair.
    for client in clients:
        directory = '.agents' if client == 'codex' else '.claude'
        target = base / directory / 'skills' / SKILL_NAME
        if target.exists() or target.is_symlink():
            parser.error(f'{target} already exists; nothing was overwritten.')
    for client in clients:
        print(f'{client}: {install(client, base)}')
    print('Restart your client or open a new session to discover the skill.')


if __name__ == '__main__':
    main()
