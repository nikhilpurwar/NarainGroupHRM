"""
Simple model downloader for insightface models during Docker build.
Downloads model zips and extracts them into the provided destination (default: /root/.insightface/models).

Usage (during Docker build):
    python scripts/download_models.py --dest /root/.insightface/models

The script is intentionally minimal and uses only stdlib so it works in the slim base image.
"""
import argparse
import os
import sys
import urllib.request
import shutil
import zipfile

MODELS = [
    {
        'name': 'buffalo_l',
        'url': 'https://github.com/deepinsight/insightface/releases/download/v0.7/buffalo_l.zip'
    }
]


def ensure_dir(path):
    os.makedirs(path, exist_ok=True)


def download_and_extract(url, dest_dir, tmp_dir='/tmp'):
    ensure_dir(dest_dir)
    fname = os.path.join(tmp_dir, os.path.basename(url))
    print(f'Downloading {url} -> {fname}')
    try:
        with urllib.request.urlopen(url) as r, open(fname, 'wb') as f:
            shutil.copyfileobj(r, f)
    except Exception as e:
        print(f'ERROR: failed to download {url}: {e}', file=sys.stderr)
        return False

    print(f'Extracting {fname} -> {dest_dir}')
    try:
        with zipfile.ZipFile(fname, 'r') as z:
            z.extractall(dest_dir)
    except Exception as e:
        print(f'ERROR: failed to extract {fname}: {e}', file=sys.stderr)
        return False

    try:
        os.remove(fname)
    except Exception:
        pass

    return True


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--dest', default='/root/.insightface/models', help='Destination directory for models')
    p.add_argument('--models', nargs='*', help='Names of models to download (default: all built-ins)')
    args = p.parse_args()

    dest = args.dest
    selected = set(args.models) if args.models else None

    print('Model downloader starting. Destination:', dest)
    ensure_dir(dest)

    any_failed = False
    for m in MODELS:
        if selected and m['name'] not in selected:
            continue
        model_dir = os.path.join(dest, m['name'])
        if os.path.exists(model_dir) and os.listdir(model_dir):
            print(f'Skipping {m["name"]}: already present at {model_dir}')
            continue
        ok = download_and_extract(m['url'], model_dir)
        if not ok:
            any_failed = True

    if any_failed:
        print('One or more models failed to download.', file=sys.stderr)
        sys.exit(2)

    print('Models downloaded successfully.')


if __name__ == '__main__':
    main()
