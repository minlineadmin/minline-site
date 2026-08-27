// Quote form submission.
//
// Kept as a real file under public/ rather than an inline <script> in the
// component: our CSP is `script-src 'self'` with no unsafe-inline, and Astro
// inlines small component scripts, which the browser would then refuse to run.
// The failure would have been silent — the form falls back to a native POST
// and the visitor lands on Formspree's own English thank-you page.
//
// Progressive enhancement: without this file the form still posts natively.

// Native validation, our wording.
//
// The browser writes its own message ("Заполните это поле") in the language of
// the browser, not of the page — so an Azerbaijani page can scold a visitor in
// Russian. setCustomValidity replaces the text with ours; the bubble's looks
// stay browser-native, which is not stylable and does not need to be.
//
// The message has to be cleared on input, otherwise a field that once failed
// stays permanently invalid and the form can never be submitted.
function localiseValidation(form) {
  const required = form.dataset.msgRequired;
  const email = form.dataset.msgEmail;
  if (!required) return;

  for (const field of form.querySelectorAll('[required]')) {
    const message = () =>
      field.validity.valueMissing ? required : field.type === 'email' ? email : '';

    field.addEventListener('invalid', () => field.setCustomValidity(message()));
    field.addEventListener('input', () => field.setCustomValidity(''));
  }
}

for (const form of document.querySelectorAll('.quote-form')) localiseValidation(form);

for (const form of document.querySelectorAll('.quote-form[action]')) {
  const status = form.querySelector('.form-status');
  const button = form.querySelector('button[type="submit"]');
  const label = button ? button.textContent : '';

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (form.dataset.busy === '1') return;

    form.dataset.busy = '1';
    if (button) {
      button.disabled = true;
      button.textContent = form.dataset.sending;
    }
    status.classList.remove('is-error', 'is-success');
    status.textContent = '';

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      });

      if (response.ok) {
        form.reset();
        status.textContent = form.dataset.success;
        status.classList.add('is-success');
        return;
      }
      throw new Error('HTTP ' + response.status);
    } catch (error) {
      status.textContent = form.dataset.error;
      status.classList.add('is-error');
    } finally {
      form.dataset.busy = '0';
      if (button) {
        button.disabled = false;
        button.textContent = label;
      }
    }
  });
}
