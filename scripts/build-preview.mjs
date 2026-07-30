// TEMPORARY skeleton-stage preview builder (zero dependencies).
//
// Why it exists: the sandbox used for the first skeleton demo had no access
// to the npm registry, so `astro build` could not run. This script renders
// the SAME content files (src/data/**) into static HTML that mirrors the
// Astro templates 1:1, so the client-facing skeleton review is not blocked.
//
// The Astro implementation (src/pages, src/templates) remains the canonical
// build. Delete this script once `astro build` is verified in CI/deploy.
//
// Usage: node scripts/build-preview.mjs  ->  dist-preview/

import { readFileSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist-preview');
const SITE = 'https://minline.az';

const LOCALES = ['az', 'en', 'ru'];
const DEFAULT_LOCALE = 'az';
const sections = JSON.parse(readFileSync(join(root, 'src/data/sections.json'), 'utf8'));

const data = {};
for (const locale of LOCALES) {
  data[locale] = { site: load(locale, 'site') };
  for (const { key } of sections) data[locale][key] = load(locale, key);
}

function load(locale, name) {
  return JSON.parse(readFileSync(join(root, `src/data/${locale}/${name}.json`), 'utf8'));
}

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const prefix = (locale) => (locale === DEFAULT_LOCALE ? '' : `/${locale}`);

function pagePath(locale, key) {
  const { slug } = data[locale][key];
  return slug ? `${prefix(locale)}/${slug}` : prefix(locale) || '/';
}

const nav = (locale) =>
  sections
    .map(({ key }) => {
      const c = data[locale][key];
      return `<a href="${pagePath(locale, key)}"${key === '__current__' ? '' : ''}>${esc(c.navLabel)}</a>`;
    })
    .join('');

function header(locale, currentKey) {
  const site = data[locale].site;
  const links = sections
    .map(({ key }) => {
      const c = data[locale][key];
      const cur = key === currentKey ? ' aria-current="page"' : '';
      return `<a href="${pagePath(locale, key)}"${cur}>${esc(c.navLabel)}</a>`;
    })
    .join('');
  const langs = LOCALES.map((l) => {
    const cur = l === locale ? ' aria-current="true"' : '';
    return `<a href="${pagePath(l, currentKey)}"${cur} lang="${l}">${l.toUpperCase()}</a>`;
  }).join('');
  return `<header class="site-header"><div class="container">
    <a class="brand" href="${pagePath(locale, 'home')}">Minline <span>Systems</span></a>
    <nav class="site-nav" aria-label="${esc(site.navAriaLabel)}">${links}</nav>
    <div class="lang-switcher">${langs}</div>
  </div></header>`;
}

function footer(locale) {
  const site = data[locale].site;
  return `<footer class="site-footer"><div class="container">
    <span>© ${new Date().getFullYear()} ${esc(site.companyName)}</span>
    <span>${esc(site.footerNote)}</span>
  </div></footer>`;
}

const card = (i) => `<div class="card"><h3>${esc(i.title)}</h3><p>${esc(i.text)}</p></div>`;

function quoteForm(locale) {
  const f = data[locale].site.form;
  return `<form class="quote-form" method="POST">
    <label>${esc(f.name)}<input type="text" name="name" required /></label>
    <label>${esc(f.company)}<input type="text" name="company" /></label>
    <label>${esc(f.email)}<input type="email" name="email" required /></label>
    <label>${esc(f.phone)}<input type="tel" name="phone" /></label>
    <label>${esc(f.message)}<textarea name="message" rows="5" required></textarea></label>
    <button class="btn btn-primary" type="submit">${esc(f.submit)}</button>
    <p class="form-note">${esc(f.pendingNote)}</p>
  </form>`;
}

const templates = {
  Home(locale, c) {
    return `
    <section class="hero"><div class="container">
      <h1>${esc(c.hero.title)}</h1><p class="lead">${esc(c.hero.lead)}</p>
      <div class="actions">
        <a class="btn btn-primary" href="${pagePath(locale, 'contacts')}">${esc(c.hero.ctaPrimary)}</a>
        <a class="btn btn-ghost" href="${pagePath(locale, 'products')}">${esc(c.hero.ctaSecondary)}</a>
      </div>
    </div></section>
    <section class="section"><div class="container">
      <h2>${esc(c.highlights.title)}</h2><div class="grid">${c.highlights.items.map(card).join('')}</div>
    </div></section>
    <section class="section"><div class="container">
      <h2>${esc(c.partner.title)}</h2><div class="section-intro"><p>${esc(c.partner.text)}</p></div>
    </div></section>
    <section class="section"><div class="container">
      <h2>${esc(c.cta.title)}</h2><div class="section-intro"><p>${esc(c.cta.text)}</p></div>
      <a class="btn btn-primary" href="${pagePath(locale, 'contacts')}">${esc(c.cta.button)}</a>
    </div></section>`;
  },
  Products(locale, c) {
    return `<section class="section"><div class="container">
      <h1>${esc(c.intro.title)}</h1><div class="section-intro"><p>${esc(c.intro.lead)}</p></div>
      <div class="grid">${c.categories.map(card).join('')}</div>
    </div></section>`;
  },
  Services(locale, c) {
    return `<section class="section"><div class="container">
      <h1>${esc(c.intro.title)}</h1><div class="section-intro"><p>${esc(c.intro.lead)}</p></div>
      <div class="grid">${c.items.map(card).join('')}</div>
    </div></section>`;
  },
  About(locale, c) {
    return `<section class="section"><div class="container">
      <h1>${esc(c.intro.title)}</h1><div class="section-intro"><p>${esc(c.intro.lead)}</p></div>
      ${c.blocks.map((b) => `<div class="section-intro"><h2>${esc(b.title)}</h2><p>${esc(b.text)}</p></div>`).join('')}
    </div></section>`;
  },
  Contacts(locale, c) {
    return `<section class="section"><div class="container">
      <h1>${esc(c.intro.title)}</h1><div class="section-intro"><p>${esc(c.intro.lead)}</p></div>
      <ul class="contact-list">${c.items
        .map((i) => `<li><strong>${esc(i.label)}:</strong> ${esc(i.value)}</li>`)
        .join('')}</ul>
      <h2>${esc(c.formTitle)}</h2><div class="section-intro"><p>${esc(c.formText)}</p></div>
      ${quoteForm(locale)}
    </div></section>`;
  }
};

function page(locale, key, template) {
  const c = data[locale][key];
  const alternates = LOCALES.map(
    (l) => `<link rel="alternate" hreflang="${l}" href="${SITE}${pagePath(l, key)}" />`
  ).join('\n    ');
  return `<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(c.metaTitle)}</title>
    <meta name="description" content="${esc(c.metaDescription)}" />
    ${alternates}
    <link rel="alternate" hreflang="x-default" href="${SITE}${pagePath(DEFAULT_LOCALE, key)}" />
    <link rel="stylesheet" href="/styles/global.css" />
  </head>
  <body>
    ${header(locale, key)}
    <main>${templates[template](locale, c)}</main>
    ${footer(locale)}
  </body>
</html>`;
}

let count = 0;
for (const locale of LOCALES) {
  for (const { key, template } of sections) {
    const p = pagePath(locale, key);
    const dir = join(out, p === '/' ? '' : p);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), page(locale, key, template));
    count++;
  }
}
mkdirSync(join(out, 'styles'), { recursive: true });
cpSync(join(root, 'src/styles/global.css'), join(out, 'styles/global.css'));
console.log(`Preview built: ${count} pages -> dist-preview/`);
