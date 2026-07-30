// Content model for minline.az
//
// Principle: adding a new section = 3 content files (az/en/ru) + one line in
// sections.json + a template. No routing code changes.
//
// File layout:
//   src/data/sections.json      — ordered registry: section key -> template
//   src/data/<locale>/site.json — per-locale site chrome (nav, footer, form labels)
//   src/data/<locale>/<key>.json — per-locale content of one section

import sections from '../data/sections.json';

export const LOCALES = ['az', 'en', 'ru'];
export const DEFAULT_LOCALE = 'az'; // served at the root, no /az prefix

const dataFiles = import.meta.glob('../data/*/*.json', { eager: true });

function loadJson(locale, name) {
  const file = dataFiles[`../data/${locale}/${name}.json`];
  if (!file) throw new Error(`Missing content file: src/data/${locale}/${name}.json`);
  return file.default ?? file;
}

export function getSite(locale) {
  return loadJson(locale, 'site');
}

export function getSectionContent(locale, key) {
  return loadJson(locale, key);
}

export function localePrefix(locale) {
  return locale === DEFAULT_LOCALE ? '' : `/${locale}`;
}

/** URL path of a section in a given locale, e.g. ('en','products') -> '/en/products' */
export function pagePath(locale, key) {
  const { slug } = getSectionContent(locale, key);
  const prefix = localePrefix(locale);
  return slug ? `${prefix}/${slug}` : (prefix || '/');
}

/** All 15 pages for getStaticPaths of src/pages/[...path].astro */
export function getAllPages() {
  const pages = [];
  for (const locale of LOCALES) {
    for (const { key, template } of sections) {
      const path = pagePath(locale, key);
      pages.push({
        // Astro rest param: undefined matches the site root '/'
        params: { path: path === '/' ? undefined : path.replace(/^\//, '') },
        props: { locale, key, template }
      });
    }
  }
  return pages;
}

/** Ordered nav items for a locale (labels come from each section's content file) */
export function getNav(locale) {
  return sections.map(({ key }) => ({
    key,
    href: pagePath(locale, key),
    label: getSectionContent(locale, key).navLabel
  }));
}

/** hreflang alternates for the same section across locales */
export function getAlternates(key) {
  return LOCALES.map((locale) => ({ locale, href: pagePath(locale, key) }));
}
