# minline.az — Minline Systems corporate website

Static multilingual website. 5 sections × 3 locales (AZ default at `/`, EN at `/en`, RU at `/ru`) = 15 pages.

## Stack

- [Astro](https://astro.build) (static output) — canonical build
- Content lives in `src/data/<locale>/*.json`, fully separated from markup
- Hosting target: Cloudflare Pages; form: Formspree (`PUBLIC_FORMSPREE_ID`); analytics: GA4 (`PUBLIC_GA_ID`)

## Architecture rule

Adding a new section = 3 content files (`az/en/ru`) + one line in `src/data/sections.json` + a template in `src/templates/`. No routing code changes. This keeps future sections cheap.

## Commands

```bash
npm install
npm run dev       # local dev
npm run build     # production build -> dist/
```

## Temporary: scripts/build-preview.mjs

`node scripts/build-preview.mjs` renders the same content into `dist-preview/` with zero dependencies. It exists only because the first skeleton demo was produced in a sandbox without npm registry access. **Astro build must be verified before alpha; delete the script after that.**

## Content status

All texts are drafts/placeholders pending: client-provided details (address, phone), confirmation of Kunlun Digital Technology materials and partnership wording, and native-speaker review of AZ/EN copy.
