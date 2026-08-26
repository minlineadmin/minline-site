// GA4 bootstrap.
//
// Same reason as quote-form.js: a real file, not an inline snippet, because
// `script-src 'self'` would block the inline one. The measurement ID travels
// in a <meta> tag rather than being written into this file, so the file stays
// static and the ID stays a build-time variable.
(function () {
  var meta = document.querySelector('meta[name="ga-id"]');
  if (!meta || !meta.content) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', meta.content);
})();
