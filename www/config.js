// Settings that differ per language/site. Fill EMAIL_ENDPOINT when the site side is ready.
window.RT_CONFIG = {
  version: '0.2.0',
  // Where the app sends email + results (WordPress endpoint, to be agreed with the site owner).
  // Empty = sending is off in this build; the form explains that honestly.
  EMAIL_ENDPOINT: { ru: 'https://robotrainer.ru/wp-json/rt/v1/app-lead', en: '' },
  // Fixed key the site expects from the app (not a password: it only tells the site the request came from the app)
  EMAIL_KEY: '4xMjzz1oodpWT5zJyO87L55fefdPQ80W',
  PRIVACY_URL: { ru: 'https://robotrainer.ru/privacy-policy/', en: 'https://robotrainerpro.com/privacy-policy/' },
  SITE_URL: { ru: 'https://robotrainer.ru/?utm_source=app&utm_medium=settings', en: 'https://robotrainerpro.com/?utm_source=app&utm_medium=settings' }
};
