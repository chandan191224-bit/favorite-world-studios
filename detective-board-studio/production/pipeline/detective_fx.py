"""Create/render silent detective board clips with the offline studio; standard library only."""
from pathlib import Path
import argparse
import subprocess

def main():
    root = Path(__file__).resolve().parents[2]
    studio = root / 'detective-board-studio'
    if not studio.exists():  # Also runs from the packaged studio/production/pipeline copy.
        studio = root
    parser = argparse.ArgumentParser(description=__doc__)
    subs = parser.add_subparsers(dest='command', required=True)
    subs.add_parser('templates')
    subs.add_parser('cameras')
    create = subs.add_parser('create')
    create.add_argument('template')
    create.add_argument('project')
    create.add_argument('--title')
    create.add_argument('--photo', action='append', default=[])
    create.add_argument('--video', action='append', default=[])
    create.add_argument('--camera')
    render = subs.add_parser('render')
    render.add_argument('project')
    render.add_argument('output')
    render.add_argument('--height', type=int, default=1080)
    render.add_argument('--fps', type=int, default=30)
    render.add_argument('--mode', choices=['composite', 'green', 'blue', 'alpha', 'matte'], default='composite')
    render.add_argument('--from', dest='start', type=float, default=0)
    render.add_argument('--to', dest='end', type=float)
    args = parser.parse_args()
    if args.command in ('templates', 'cameras'):
        cmd = ['node', str(studio / 'project.mjs'), args.command]
    elif args.command == 'create':
        cmd = ['node', str(studio / 'project.mjs'), 'create', args.template, str(Path(args.project).resolve())]
        for key in ('title', 'camera'):
            if getattr(args, key):
                cmd += ['--' + key, getattr(args, key)]
        for key in ('photo', 'video'):
            for media in getattr(args, key):
                cmd += ['--' + key, str(Path(media).resolve())]
    else:
        cmd = ['node', str(studio / 'render.mjs'), str(Path(args.project).resolve()), str(Path(args.output).resolve()), '--height', str(args.height), '--fps', str(args.fps), '--mode', args.mode, '--from', str(args.start)]
        if args.end is not None:
            cmd += ['--to', str(args.end)]
    subprocess.run(cmd, check=True, cwd=studio)

if __name__ == '__main__':
    main()
