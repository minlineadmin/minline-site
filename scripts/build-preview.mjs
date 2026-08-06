// TEMPORARY preview builder (zero dependencies) — screenshots only.
// The sandbox has no npm registry access, so `astro build` cannot run here.
// This renders the SAME content files (src/data/**) into static HTML mirroring
// the Astro templates, purely so the client-facing preview is not blocked.
// Astro (src/pages, src/templates) remains the canonical build — verify with
// `npm run build` on a machine with registry access. Delete this file after.
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

const ICONS = {
  smartfield: `<svg class="dir-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <circle cx="24" cy="24" r="5.5" stroke="currentColor" stroke-width="1.6"/>
    <circle cx="24" cy="24" r="1.8" fill="currentColor"/>
    <path d="M24 18.5V7M24 29.5V41M18.5 24H7M29.5 24H41M20.1 20.1l-7.9-7.9M27.9 27.9l7.9 7.9M27.9 20.1l7.9-7.9M20.1 27.9l-7.9 7.9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
    <circle cx="24" cy="6" r="2.4" stroke="currentColor" stroke-width="1.4"/>
    <circle cx="24" cy="42" r="2.4" stroke="currentColor" stroke-width="1.4"/>
    <circle cx="6" cy="24" r="2.4" stroke="currentColor" stroke-width="1.4"/>
    <circle cx="42" cy="24" r="2.4" stroke="currentColor" stroke-width="1.4"/>
    <circle cx="10.6" cy="10.6" r="2" stroke="currentColor" stroke-width="1.3"/>
    <circle cx="37.4" cy="37.4" r="2" stroke="currentColor" stroke-width="1.3"/>
    <circle cx="37.4" cy="10.6" r="2" stroke="currentColor" stroke-width="1.3"/>
    <circle cx="10.6" cy="37.4" r="2" stroke="currentColor" stroke-width="1.3"/>
  </svg>`,
  pumps: `<svg class="dir-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <path d="M6 40h36" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M14 40V26M22 40V26M14 26h8" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M18 26 10.5 14.5M18 26l7.5-11.5" stroke="currentColor" stroke-width="1.3"/>
    <path d="M9 12.5 34 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M34 9v7c0 2.5-2 4.5-4.5 4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    <circle cx="18" cy="13" r="2.6" stroke="currentColor" stroke-width="1.4"/>
    <path d="M29.5 20.5V40" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M26 40v-4.5h7V40" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
  </svg>`
};

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
  const s = data[locale].site;
  return `<footer class="site-footer"><div class="container">
    <span>© 2026 ${esc(s.companyName)}</span>
    <span>${esc(s.footerTaxLabel)}: ${esc(s.footerTax)}</span>
    <span>${esc(s.footerNote)}</span>
  </div></footer>`;
}

const card = (i) => `<div class="card"><h3>${esc(i.title)}</h3><p>${esc(i.text)}</p></div>`;

function quoteForm(locale) {
  const f = data[locale].site.form;
  const fld = (label, ph, type, name) =>
    `<label><span>${esc(label)}</span><input type="${type}" name="${name}" placeholder="${esc(ph)}"></label>`;
  return `<form class="quote-form" method="POST">
    ${fld(f.name, f.namePlaceholder, 'text', 'name')}
    ${fld(f.company, f.companyPlaceholder, 'text', 'company')}
    ${fld(f.email, f.emailPlaceholder, 'email', 'email')}
    ${fld(f.phone, f.phonePlaceholder, 'tel', 'phone')}
    <label><span>${esc(f.message)}</span><textarea name="message" rows="5" placeholder="${esc(f.messagePlaceholder)}"></textarea></label>
    <button class="btn btn-primary" type="submit">${esc(f.submit)}</button>
    <p class="form-note">${esc(f.pendingNote)}</p>
  </form>`;
}

const ctaBlock = (locale, c) => `<section class="section"><div class="container">
  <h2>${esc(c.cta.title)}</h2><div class="section-intro"><p>${esc(c.cta.text)}</p></div>
  <a class="btn btn-primary" href="${pagePath(locale, 'contacts')}">${esc(c.cta.button)}</a>
</div></section>`;

const templates = {
  Home(locale, c) {
    return `
    <section class="hero"><div class="container">
      <h1>${esc(c.hero.title)}</h1><p class="lead">${esc(c.hero.lead)}</p>
      <div class="actions">
        <a class="btn btn-primary" href="#directions">${esc(c.hero.ctaPrimary)}</a>
        <a class="btn btn-ghost" href="${pagePath(locale, 'contacts')}">${esc(c.hero.ctaSecondary)}</a>
      </div>
    </div></section>
    <section class="section" id="directions"><div class="container">
      <h2>${esc(c.directions.title)}</h2>
      <div class="section-intro"><p>${esc(c.directions.lead)}</p></div>
      <div class="grid grid-2">${c.directions.items
        .map(
          (i) => `<a class="card card-link" href="${pagePath(locale, i.key)}">
            ${ICONS[i.key] || ''}<h3>${esc(i.title)}</h3><p>${esc(i.text)}</p>
            <span class="card-more">${esc(i.more)}</span></a>`
        )
        .join('')}</div>
    </div></section>
    <section class="section"><div class="container">
      <h2>${esc(c.advantages.title)}</h2>
      <div class="grid">${c.advantages.items.map(card).join('')}</div>
    </div></section>
    ${ctaBlock(locale, c)}`;
  },
  Direction(locale, c) {
    return `
    <section class="section section-lead"><div class="container">
      <p class="eyebrow">${esc(c.eyebrow)}</p>
      <h1>${esc(c.intro.title)}</h1>
      <div class="section-intro"><p class="lead">${esc(c.intro.lead)}</p></div>
    </div></section>
    <section class="section"><div class="container">
      <h2>${esc(c.blocksTitle)}</h2>
      <div class="grid">${c.blocks.map(card).join('')}</div>
    </div></section>
    ${ctaBlock(locale, c)}`;
  },
  Services(locale, c) {
    return `
    <section class="section section-lead"><div class="container">
      <h1>${esc(c.intro.title)}</h1>
      <div class="section-intro"><p class="lead">${esc(c.intro.lead)}</p></div>
    </div></section>
    <section class="section"><div class="container">
      <div class="grid">${c.items.map(card).join('')}</div>
    </div></section>
    ${ctaBlock(locale, c)}`;
  },
  About(locale, c) {
    return `
    <section class="section section-lead"><div class="container">
      <h1>${esc(c.intro.title)}</h1>
      <div class="section-intro">${c.intro.paragraphs.map((p) => `<p class="lead">${esc(p)}</p>`).join('')}</div>
    </div></section>
    <section class="section"><div class="container">
      <h2>${esc(c.advantages.title)}</h2>
      <div class="grid">${c.advantages.items.map(card).join('')}</div>
    </div></section>
    ${ctaBlock(locale, c)}`;
  },
  Contacts(locale, c) {
    return `
    <section class="section section-lead"><div class="container">
      <h1>${esc(c.intro.title)}</h1>
      <div class="section-intro"><p class="lead">${esc(c.intro.lead)}</p></div>
    </div></section>
    <section class="section"><div class="container">
      <div class="contacts-layout">
        <div><h2>${esc(c.formTitle)}</h2>${quoteForm(locale)}</div>
        <aside class="contacts-details">
          <h2>${esc(c.detailsTitle)}</h2>
          <ul class="contact-list">${c.items
            .map(
              (i) =>
                `<li><span class="contact-label">${esc(i.label)}</span>${
                  i.href
                    ? `<a href="${esc(i.href)}">${esc(i.value)}</a>`
                    : `<span class="contact-value">${esc(i.value)}</span>`
                }</li>`
            )
            .join('')}</ul>
        </aside>
      </div>
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
    const dir = join(out, p === '/' ? '' : decodeURIComponent(p));
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), page(locale, key, template));
    count++;
  }
}
mkdirSync(join(out, 'styles'), { recursive: true });
cpSync(join(root, 'src/styles/global.css'), join(out, 'styles/global.css'));
console.log(`Preview built: ${count} pages -> dist-preview/`);
