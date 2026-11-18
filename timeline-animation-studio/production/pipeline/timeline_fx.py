"""Create and render silent timeline clips with Timeline Animation Studio Pro."""
from pathlib import Path
import subprocess
import sys

def main():
    root = Path(__file__).resolve().parents[2]
    studio = root / 'timeline-animation-studio'
    if not studio.exists():
        studio = root
    if len(sys.argv) < 2:
        print('timeline_fx.py templates | layouts | create PRESET PROJECT [options] | render PROJECT OUTPUT [options]')
        return
    command, *args = sys.argv[1:]
    if command not in {'templates', 'layouts', 'create', 'render'}:
        raise SystemExit('Choose templates, layouts, create or render.')
    script = 'render.mjs' if command == 'render' else 'project.mjs'
    call = ['node', str(studio / script)]
    if command != 'render':
        call.append(command)
    # Paths and options retain the caller's working directory.
    raise SystemExit(subprocess.call(call + args))

if __name__ == '__main__':
    main()
