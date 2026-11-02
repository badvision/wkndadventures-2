/* eslint-disable */
/* global WebImporter */

/**
 * WKND Adventures cleanup transformer.
 * Removes non-authorable site chrome and decorative markup.
 * Selectors verified against migration-work/cleaned.html.
 */

function removeAll(root, selectors) {
  selectors.forEach((sel) => {
    root.querySelectorAll(sel).forEach((el) => el.remove());
  });
}

/**
 * The source ticker repeats its item list twice for a seamless CSS loop
 * (not marked aria-hidden). The cards-ticker block duplicates the list
 * itself, so keep each item once: drop the second half only when it is an
 * exact repeat of the first half.
 */
function dedupeTicker(root) {
  root.querySelectorAll('div.ticker-track').forEach((track) => {
    // Explicitly hidden duplicates (if the source ever marks them).
    track.querySelectorAll('[aria-hidden="true"]').forEach((el) => el.remove());
    const items = [...track.children].filter((el) => !el.classList.contains('ticker-sep'));
    if (items.length < 2 || items.length % 2 !== 0) return;
    const half = items.length / 2;
    const text = (el) => el.textContent.trim();
    const isRepeat = items.slice(0, half).every((el, i) => text(el) === text(items[half + i]));
    if (isRepeat) items.slice(half).forEach((el) => el.remove());
  });
}

const SITE_ORIGIN = 'https://wknd-adventures.com';
const SITE_HOSTS = ['wknd-adventures.com', 'www.wknd-adventures.com', 'wkndadventures.com', 'www.wkndadventures.com'];

function pageUrl(payload) {
  const original = payload && payload.params && payload.params.originalURL;
  try {
    const u = new URL(original);
    return `${SITE_ORIGIN}${u.pathname}`;
  } catch (e) {
    return `${SITE_ORIGIN}/`;
  }
}

/**
 * Source pages use bare relative image paths ("images/x.jpg"), which the
 * importer's adjustImageUrls rule cannot parse and silently drops. Resolve
 * every image against the source page so default-content images survive.
 */
function absolutizeImages(root, base) {
  root.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src');
    if (!src || src.startsWith('data:')) return;
    try {
      const abs = new URL(src, base);
      if (SITE_HOSTS.includes(abs.host)) abs.host = new URL(SITE_ORIGIN).host;
      img.setAttribute('src', abs.toString());
    } catch (e) {
      // leave as-is
    }
    img.removeAttribute('loading');
    img.removeAttribute('srcset');
  });
}

/**
 * Internal links become site-relative EDS paths without the .html
 * extension (about.html -> /about, index.html -> /).
 */
function normalizeLinks(root, base) {
  root.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href').trim();
    if (!href || href.startsWith('#') || /^(mailto|tel|javascript):/i.test(href)) return;
    let u;
    try { u = new URL(href, base); } catch (e) { return; }
    if (!SITE_HOSTS.includes(u.host)) return;
    let path = u.pathname.replace(/\/index\.html?$/, '/').replace(/\.html?$/, '');
    if (path.length > 1) path = path.replace(/\/$/, '');
    a.setAttribute('href', `${path}${u.search}${u.hash}`);
  });
}

/**
 * Default-content CTAs (div.button-group, standalone a.button*) become one
 * paragraph per link so EDS decorateButtons can style them:
 * a.button -> <strong> (primary), a.accent-button -> <strong><em> (accent),
 * a.button--ghost -> <em>
 * (secondary), a.text-button -> plain link. Block tables are left alone.
 */
const BUTTON_SELECTOR = 'a.button, a.accent-button, a.button--ghost, a.text-button';

function buttonParagraph(document, a, label, ghost) {
  const link = document.createElement('a');
  link.setAttribute('href', a.getAttribute('href'));
  link.textContent = (label || a).textContent.trim();
  const p = document.createElement('p');
  if (ghost || a.classList.contains('button--ghost')) {
    const em = document.createElement('em');
    em.append(link);
    p.append(em);
  } else if (a.classList.contains('text-button')) {
    p.append(link);
  } else if (a.classList.contains('accent-button')) {
    const strong = document.createElement('strong');
    const em = document.createElement('em');
    em.append(link);
    strong.append(em);
    p.append(strong);
  } else {
    const strong = document.createElement('strong');
    strong.append(link);
    p.append(strong);
  }
  return p;
}

/**
 * The importer merges adjacent links that share an href (e.g. /about:
 * "Community" + ghost "Submit a Story" both -> community.html), leaving one
 * anchor with several .button-label spans. Split those back into one CTA per
 * label; labels after the first were the ghost variant in the source.
 */
function buttonParagraphs(document, a) {
  const labels = [...a.querySelectorAll('.button-label')];
  if (labels.length <= 1) return [buttonParagraph(document, a, labels[0], false)];
  return labels.map((label, i) => buttonParagraph(document, a, label, i > 0));
}

function convertDefaultButtons(root) {
  const { ownerDocument: document } = root;
  root.querySelectorAll('div.button-group').forEach((group) => {
    if (group.closest('table')) return;
    const links = [...group.querySelectorAll(BUTTON_SELECTOR)];
    if (!links.length) return;
    group.replaceWith(...links.flatMap((a) => buttonParagraphs(document, a)));
  });
  root.querySelectorAll(BUTTON_SELECTOR).forEach((a) => {
    if (a.closest('table')) return;
    const ps = buttonParagraphs(document, a);
    const parent = a.parentElement;
    if (parent && parent.tagName === 'P' && parent.textContent.trim() === a.textContent.trim()) {
      parent.replaceWith(...ps);
    } else {
      a.replaceWith(...ps);
    }
  });
}

export default function transform(hookName, element, payload) {
  if (hookName === 'beforeTransform') {
    const base = pageUrl(payload);
    absolutizeImages(element, base);
    normalizeLinks(element, base);
    // Site chrome that could otherwise be matched by block parsers.
    removeAll(element, [
      'a.skip-link',
      'div.navbar',
      'nav.nav-menu',
      'button.nav-mobile-menu-button',
      'footer.footer',
      'footer.inverse-footer',
      // Decorative hero overlay
      'div.hero-bg > div.overlay',
      // Ticker separators: the cards-ticker block renders its own
      'div.ticker-track > span.ticker-sep',
    ]);
    dedupeTicker(element);
  }

  if (hookName === 'afterTransform') {
    // Parsers may have created new images/links; normalize once more.
    absolutizeImages(element, pageUrl(payload));
    normalizeLinks(element, pageUrl(payload));
    convertDefaultButtons(element);
    removeAll(element, [
      'header',
      'footer',
      'nav',
      'script',
      'style',
      'noscript',
      'link',
      'iframe',
    ]);
    // Tracking / interaction attributes left on authorable elements.
    element.querySelectorAll('[onclick], [data-track], [data-analytics]').forEach((el) => {
      el.removeAttribute('onclick');
      el.removeAttribute('data-track');
      el.removeAttribute('data-analytics');
    });
  }
}
