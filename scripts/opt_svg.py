"""Shrink auto-traced SVG illustrations.

The supplied files were produced by tracing a raster, which leaves two kinds of
waste: thousands of 1-3 pixel subpaths that are tracing noise rather than
drawing, and coordinates carried to a precision the artwork never had.

This drops subpaths whose bounding box is below a threshold and rounds what is
left. Everything else in the file — gradients, filters, structure — is
untouched. Compare the before/after renders; if detail is lost, lower MIN_AREA.

Usage: python3 opt_svg.py <in.svg> <out.svg> [min_area]
"""
import re
import sys
import pathlib

NUM = re.compile(r'-?\d+(?:\.\d+)?')


def subpath_bbox(sub):
    nums = [float(n) for n in NUM.findall(sub)]
    xs, ys = nums[0::2], nums[1::2]
    if not xs or not ys:
        return 0.0, 0.0
    return max(xs) - min(xs), max(ys) - min(ys)


def clean_d(d, min_area):
    # split on M/m, keeping the command with its subpath
    parts = re.split(r'(?=[Mm])', d)
    kept = []
    for sub in parts:
        if not sub.strip():
            continue
        w, h = subpath_bbox(sub)
        if w * h < min_area and max(w, h) < 4:
            continue
        kept.append(sub)
    out = "".join(kept)
    # integer coordinates: the source art has no sub-pixel detail
    out = NUM.sub(lambda m: str(int(round(float(m.group())))), out)
    # strip redundant separators
    out = re.sub(r'\s+', ' ', out).replace(' L', 'L').replace(' M', 'M').replace(' Z', 'Z')
    out = re.sub(r'([A-Za-z]) ', r'\1', out)
    return out


def main(src, dst, min_area):
    s = pathlib.Path(src).read_text(encoding='utf8', errors='replace')
    stats = {'before': 0, 'after': 0}

    def repl(m):
        d = m.group(1)
        stats['before'] += len(d)
        nd = clean_d(d, min_area)
        stats['after'] += len(nd)
        return f' d="{nd}"'

    s = re.sub(r'\sd="([^"]+)"', repl, s)
    s = re.sub(r'>\s+<', '><', s)
    pathlib.Path(dst).write_text(s, encoding='utf8')
    print(f"{pathlib.Path(src).name}: d-данные {stats['before']} -> {stats['after']}, "
          f"файл {pathlib.Path(src).stat().st_size} -> {pathlib.Path(dst).stat().st_size}")


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], float(sys.argv[3]) if len(sys.argv) > 3 else 6.0)
