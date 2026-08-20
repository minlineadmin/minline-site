"""Generate marble vein networks as SVG.

Attempt 1 drew constant-width strokes — which is what a hair is, and that is
exactly what the client saw. Attempt 2 added width and glow but kept smooth
sinusoidal wander, so it read as roots.

Marble veining is a *crack* filled with mineral. Cracks run nearly straight and
change direction abruptly; they fork at acute angles and keep the parent's
heading; they thin to nothing at the tips; the network encloses irregular
cells; and intensity varies along one vein — parts are bright, parts vanish
into the stone. This generator reproduces those properties:

  * jagged centrelines: small drift plus occasional sharp kinks, no smooth arcs
  * acute branching (12-30 deg) at the kinks, where cracks really fork
  * per-segment opacity so a vein fades in and out along its length
  * tapered filled outlines rather than strokes
  * a warm haze under the network and a mottled stone field behind it

Usage: python3 gen_veins.py <seed> <output.svg> [tl|br|field]
"""

import math
import random
import sys

SIZE = 1000.0


def taper(t):
    """Widest a third of the way along, drawn to a point at both ends."""
    return max(0.0, math.sin(math.pi * min(1.0, t ** 0.7)) ** 0.5)


def walk(rng, x, y, angle, length, width, kink_rate=0.16, drift=0.055):
    """A crack path: near-straight runs punctuated by abrupt direction changes."""
    step = rng.uniform(16, 26)
    steps = max(6, int(length / step))
    pts, kinks = [], []
    for i in range(steps + 1):
        t = i / steps
        pts.append((x, y, width * taper(t) * rng.uniform(0.8, 1.15)))
        angle += rng.uniform(-drift, drift)
        if i and i < steps - 2 and rng.random() < kink_rate:
            angle += rng.choice([-1, 1]) * rng.uniform(0.22, 0.62)
            kinks.append(i)
        x += math.cos(angle) * step
        y += math.sin(angle) * step
    return pts, kinks


def outline(pts):
    """Offset the centreline by +/- half width to get a closed fillable shape."""
    left, right = [], []
    for i, (x, y, w) in enumerate(pts):
        if i == 0:
            dx, dy = pts[1][0] - x, pts[1][1] - y
        elif i == len(pts) - 1:
            dx, dy = x - pts[-2][0], y - pts[-2][1]
        else:
            dx, dy = pts[i + 1][0] - pts[i - 1][0], pts[i + 1][1] - pts[i - 1][1]
        m = math.hypot(dx, dy) or 1.0
        nx, ny = -dy / m * w / 2, dx / m * w / 2
        left.append((x + nx, y + ny))
        right.append((x - nx, y - ny))
    return left + right[::-1]


def to_path(poly):
    d = [f"M{poly[0][0]:.0f} {poly[0][1]:.0f}"]
    for x, y in poly[1:]:
        d.append(f"L{x:.0f} {y:.0f}")
    d.append("Z")
    return "".join(d)


def emit(rng, pts, out, base_opacity):
    """Cut the vein into short runs so its intensity varies along the length."""
    i = 0
    while i < len(pts) - 2:
        n = rng.randint(3, 7)
        chunk = pts[i:i + n + 1]
        if len(chunk) >= 3:
            out.append((to_path(outline(chunk)),
                        round(base_opacity * rng.uniform(0.35, 1.0), 2)))
        i += n


def network(seed):
    rng = random.Random(seed)
    out = []

    trunks = []
    for _ in range(4):
        pts, kinks = walk(rng, rng.uniform(-120, 140), rng.uniform(-120, 140),
                          rng.uniform(0.25, 1.30), rng.uniform(820, 1240),
                          rng.uniform(3.4, 6.4))
        trunks.append((pts, kinks))
        emit(rng, pts, out, 1.0)

    for pts, kinks in trunks:
        for i in kinks:
            if rng.random() > 0.75:
                continue
            bx, by, bw = pts[i]
            nxt = pts[min(i + 1, len(pts) - 1)]
            base = math.atan2(nxt[1] - by, nxt[0] - bx)
            sub, subk = walk(rng, bx, by,
                             base + rng.choice([-1, 1]) * rng.uniform(0.21, 0.52),
                             rng.uniform(150, 420), max(1.4, bw * 0.55),
                             kink_rate=0.2)
            emit(rng, sub, out, 0.85)
            for j in subk:
                if rng.random() > 0.55:
                    continue
                cx, cy, cw = sub[j]
                nx2 = sub[min(j + 1, len(sub) - 1)]
                cbase = math.atan2(nx2[1] - cy, nx2[0] - cx)
                cap, _ = walk(rng, cx, cy,
                              cbase + rng.choice([-1, 1]) * rng.uniform(0.25, 0.7),
                              rng.uniform(45, 150), max(0.7, cw * 0.5),
                              kink_rate=0.25)
                emit(rng, cap, out, 0.6)

    # Crazing: short independent hairline cracks, denser toward the corner.
    # Without them the network looks drawn rather than broken.
    for _ in range(46):
        x = (rng.random() ** 1.7) * SIZE * rng.uniform(0.15, 1.05)
        y = (rng.random() ** 1.7) * SIZE * rng.uniform(0.15, 1.05)
        cap, _ = walk(rng, x, y, rng.uniform(0, math.tau), rng.uniform(40, 165),
                      rng.uniform(0.7, 1.9), kink_rate=0.22)
        emit(rng, cap, out, rng.uniform(0.3, 0.62))
    return out


def field(seed, size):
    """A full slab: veining spread over the whole canvas.

    Uniform density reads as wallpaper, so the field keeps a dominant diagonal
    flow and a few quiet zones — real stone has stretches with almost no
    veining, and those breaks are what make the busy parts look natural.
    """
    rng = random.Random(seed)
    out = []

    quiet = [(rng.uniform(0, size), rng.uniform(0, size), rng.uniform(150, 320))
             for _ in range(5)]

    def in_quiet(x, y):
        return any(math.hypot(x - qx, y - qy) < qr for qx, qy, qr in quiet)

    flow = rng.uniform(0.3, 0.75)      # dominant heading of the slab
    trunks = []
    for _ in range(9):
        # start somewhere along the top or left edge, or inside the slab
        if rng.random() < 0.55:
            x, y = rng.uniform(-0.15, 1.05) * size, rng.uniform(-0.2, 0.1) * size
        else:
            x, y = rng.uniform(-0.2, 0.1) * size, rng.uniform(-0.1, 1.05) * size
        angle = flow + rng.uniform(-0.55, 0.55)
        pts, kinks = walk(rng, x, y, angle, rng.uniform(900, 1800),
                          rng.uniform(2.8, 5.6))
        trunks.append((pts, kinks))
        emit(rng, [p for p in pts if not in_quiet(p[0], p[1])], out, 0.95)

    for pts, kinks in trunks:
        for i in kinks:
            if rng.random() > 0.62:
                continue
            bx, by, bw = pts[i]
            if in_quiet(bx, by):
                continue
            nxt = pts[min(i + 1, len(pts) - 1)]
            base = math.atan2(nxt[1] - by, nxt[0] - bx)
            sub, subk = walk(rng, bx, by,
                             base + rng.choice([-1, 1]) * rng.uniform(0.21, 0.52),
                             rng.uniform(160, 520), max(1.2, bw * 0.55),
                             kink_rate=0.2)
            emit(rng, sub, out, 0.8)
            for j in subk:
                if rng.random() > 0.5:
                    continue
                cx, cy, cw = sub[j]
                nx2 = sub[min(j + 1, len(sub) - 1)]
                cbase = math.atan2(nx2[1] - cy, nx2[0] - cx)
                cap, _ = walk(rng, cx, cy,
                              cbase + rng.choice([-1, 1]) * rng.uniform(0.25, 0.7),
                              rng.uniform(45, 170), max(0.6, cw * 0.5),
                              kink_rate=0.25)
                emit(rng, cap, out, 0.55)

    for _ in range(120):
        x, y = rng.uniform(0, size), rng.uniform(0, size)
        if in_quiet(x, y):
            continue
        cap, _ = walk(rng, x, y, flow + rng.uniform(-1.1, 1.1),
                      rng.uniform(35, 170), rng.uniform(0.6, 1.7), kink_rate=0.22)
        emit(rng, cap, out, rng.uniform(0.25, 0.55))
    return out


FIELD_DOC = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 1400" width="1400" height="1400" preserveAspectRatio="xMidYMid slice">
  <defs>
    <!-- Dimmer than the corner tiles on purpose: this slab sits behind body
         text, and the bright core of a vein would drop text contrast below
         WCAG AA where the two overlap. -->
    <linearGradient id="v" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#d3b271"/>
      <stop offset=".35" stop-color="#ac8b46"/>
      <stop offset="1" stop-color="#6a5124"/>
    </linearGradient>
    <filter id="haze" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="7"/>
    </filter>
    <filter id="cloud" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.0035 0.005" numOctaves="4" seed="__SEED__"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.42  0 0 0 0 0.33  0 0 0 0 0.17  0 0 0 0.34 0"/>
    </filter>
  </defs>
  <g filter="url(#cloud)" opacity=".5"><rect width="1400" height="1400"/></g>
  <g fill="url(#v)">
    <g filter="url(#haze)" opacity=".45">
__PATHS__
    </g>
__PATHS__
  </g>
</svg>
"""


DOC = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">
  <defs>
    <linearGradient id="v" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f0d79a"/>
      <stop offset=".35" stop-color="#cda65b"/>
      <stop offset="1" stop-color="#7d6029"/>
    </linearGradient>
    <radialGradient id="fade" cx="__CX__" cy="__CY__" r="96%">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset=".42" stop-color="#ffffff" stop-opacity=".78"/>
      <stop offset=".72" stop-color="#ffffff" stop-opacity=".3"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <mask id="corner">
      <rect width="1000" height="1000" fill="url(#fade)"/>
    </mask>
    <radialGradient id="stone" cx="__CX__" cy="__CY__" r="84%">
      <stop offset="0" stop-color="#3a2f1c" stop-opacity=".5"/>
      <stop offset=".55" stop-color="#241d12" stop-opacity=".2"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <filter id="haze" x="-15%" y="-15%" width="130%" height="130%">
      <feGaussianBlur stdDeviation="7"/>
    </filter>
    <filter id="cloud" x="-15%" y="-15%" width="130%" height="130%">
      <feTurbulence type="fractalNoise" baseFrequency="0.004 0.006" numOctaves="4" seed="__SEED__"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.42  0 0 0 0 0.33  0 0 0 0 0.17  0 0 0 0.40 0"/>
    </filter>
  </defs>

  <!-- The whole tile fades out from its corner, so the asset carries its own
       falloff and never shows a rectangular edge over the page. -->
  <g mask="url(#corner)">
    <!-- mottled stone field: without it the veins read as lines drawn on black -->
    <rect width="1000" height="1000" fill="url(#stone)"/>
    <g filter="url(#cloud)" opacity=".45"><rect width="1000" height="1000"/></g>

    <g fill="url(#v)" transform="__XF__">
      <g filter="url(#haze)" opacity=".5">
__PATHS__
      </g>
__PATHS__
    </g>
  </g>
</svg>
"""


if __name__ == "__main__":
    seed, dest = int(sys.argv[1]), sys.argv[2]
    corner = sys.argv[3] if len(sys.argv) > 3 else "tl"
    if corner == "field":
        body = "\n".join(f'      <path d="{d}" opacity="{o}"/>'
                         for d, o in field(seed, 1400.0))
        doc = FIELD_DOC.replace("__PATHS__", body).replace("__SEED__", str(seed))
        open(dest, "w", encoding="utf8").write(doc)
        print(dest, len(doc), "bytes")
        sys.exit(0)
    cx, cy = ("16%", "16%") if corner == "tl" else ("84%", "84%")
    xf = "translate(0 0)" if corner == "tl" else "rotate(180 500 500)"
    body = "\n".join(f'      <path d="{d}" opacity="{o}"/>' for d, o in network(seed))
    doc = (DOC.replace("__PATHS__", body).replace("__SEED__", str(seed))
              .replace("__CX__", cx).replace("__CY__", cy).replace("__XF__", xf))
    open(dest, "w", encoding="utf8").write(doc)
    print(dest, len(doc), "bytes")
