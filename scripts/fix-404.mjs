// Post-build fixup for the per-locale 404 pages.
//
// Astro is configured with `build.format: 'directory'`, which is what gives the
// site its clean URLs (/elaqe, not /elaqe.html). The same rule applies to
// src/pages/en/404.astro, so Astro writes it to dist/en/404/index.html.
//
// Cloudflare's `not_found_handling: "404-page"` looks for a file named exactly
// 404.html beside the missing address, then walks up the tree. A directory
// called 404/ is invisible to it, so every locale fell through to the root
// Azerbaijani page. Astro special-cases only the root 404, which is why that
// one worked and the nested ones did not.
//
// This moves each nested page to the name Cloudflare looks for. The directory
// is removed rather than kept, so /en/404 stops resolving with status 200 —
// one address per page, and a request for it now goes through the 404 path
// like any other unknown address.

import { existsSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (!existsSync(dist)) {
  console.error('fix-404: dist/ not found — run astro build first');
  process.exit(1);
}

const moved = [];
for (const entry of readdirSync(dist)) {
  const nested = join(dist, entry, '404', 'index.html');
  if (!statSync(join(dist, entry)).isDirectory() || !existsSync(nested)) continue;
  renameSync(nested, join(dist, entry, '404.html'));
  rmSync(join(dist, entry, '404'), { recursive: true, force: true });
  moved.push(`${entry}/404.html`);
}

console.log(
  moved.length ? `fix-404: ${moved.join(', ')}` : 'fix-404: nothing to move'
);
