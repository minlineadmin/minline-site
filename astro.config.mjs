// @ts-check
import { defineConfig } from 'astro/config';

// Static output, no SSR. All routing is generated from content files —
// see src/lib/content.js and src/pages/[...path].astro.
export default defineConfig({
  site: 'https://minline.az',
  output: 'static',
  trailingSlash: 'never',
  build: {
    format: 'directory'
  }
});
