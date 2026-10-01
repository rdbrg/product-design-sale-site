document.documentElement.classList.add('js');

const toggle = document.querySelector<HTMLButtonElement>('.menu-toggle');
const navigation = document.querySelector<HTMLElement>('#navigation');
const mobile = window.matchMedia('(max-width: 900px)');

function closeMenu(restoreFocus = false) {
  toggle?.setAttribute('aria-expanded', 'false');
  navigation?.classList.remove('is-open');
  if (restoreFocus) toggle?.focus();
}

if (toggle && navigation) {
  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    const opened = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!opened));
    navigation.classList.toggle('is-open', !opened);
  });
  navigation.addEventListener('click', event => {
    const link = (event.target as Element).closest<HTMLAnchorElement>('a');
    if (!link) return;
    closeMenu();
    const href = link.getAttribute('href');
    if (mobile.matches && href?.startsWith('#')) {
      const target = document.querySelector<HTMLElement>(href);
      target?.setAttribute('tabindex', '-1');
      target?.focus({ preventScroll: true });
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') closeMenu(true);
  });
  document.addEventListener('click', event => {
    if (!(event.target as Element).closest('.site-header')) closeMenu();
  });
  mobile.addEventListener('change', () => closeMenu());
}

type AnalyticsEvent = 'primary_cta' | 'service_contact' | 'case_open' | 'template_copy' | 'telegram_click' | 'email_click';
function track(name: AnalyticsEvent, properties: Record<string, string> = {}) {
  // A local integration hook only. No requests, identifiers or message contents.
  window.dispatchEvent(new CustomEvent('rodberg:analytics', { detail: { name, ...properties } }));
}

document.addEventListener('click', event => {
  const link = (event.target as Element).closest<HTMLAnchorElement>('a[data-event]');
  if (!link) return;
  const name = link.dataset.event as AnalyticsEvent;
  const properties: Record<string, string> = {};
  for (const key of ['placement', 'service', 'case']) {
    if (link.dataset[key]) properties[key] = link.dataset[key]!;
  }
  track(name, properties);
  if (link.href.startsWith('https://t.me/') && name !== 'telegram_click') track('telegram_click', properties);
});

const copyButton = document.querySelector<HTMLButtonElement>('#copy-brief');
const brief = document.querySelector<HTMLTextAreaElement>('#brief');
const copyStatus = document.querySelector<HTMLElement>('#copy-status');
if (copyButton && brief && copyStatus) {
  copyButton.hidden = false;
  copyButton.addEventListener('click', async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(brief.value);
      copyStatus.textContent = 'Шаблон скопирован. Вставьте его в сообщение Вадиму.';
      track('template_copy', { result: 'success' });
    } catch {
      brief.focus();
      brief.select();
      copyStatus.textContent = 'Текст выделен. Скопируйте его вручную: Ctrl+C, ⌘C или через меню выделения.';
      track('template_copy', { result: 'manual' });
    }
  });
}
