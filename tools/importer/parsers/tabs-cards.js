/* eslint-disable */
/* global WebImporter */

/**
 * Parser: tabs-cards
 * Source: div.tab-container > div.tab-menu > button.tab-menu-link (labels)
 *         div.tab-pane (one per tab, matched by data-tab / aria-controls / id, else by position)
 *           > div.grid-layout > a.article-card (image, div.tag, h3, p)
 * Target: one row per tab: [label] [repeating card groups: img, tag p, h3 > a(card href), p].
 * Hidden (non-active) panes are included.
 */

const ORIGIN = 'https://wknd-adventures.com';

function getPageUrl(document, opts) {
  const o = opts || {};
  const canonical = document.querySelector('link[rel="canonical"]');
  const candidates = [
    o.params && o.params.originalURL,
    o.url,
    canonical && canonical.getAttribute('href'),
  ];
  for (let i = 0; i < candidates.length; i += 1) {
    const c = candidates[i];
    if (!c) continue;
    try {
      const u = new URL(c, ORIGIN);
      return new URL(u.pathname + u.search, ORIGIN).href;
    } catch (e) { /* try next */ }
  }
  return `${ORIGIN}/`;
}

function absImageSrc(src, pageUrl) {
  if (!src) return '';
  try {
    const u = new URL(src, pageUrl);
    if (/^(localhost|127\.0\.0\.1)$/.test(u.hostname)) return new URL(u.pathname + u.search, ORIGIN).href;
    return u.href;
  } catch (e) {
    return src;
  }
}

function fixHref(href, pageUrl) {
  if (!href) return href;
  const h = href.trim();
  if (/^(#|mailto:|tel:|javascript:)/i.test(h)) return h;
  try {
    const u = new URL(h, pageUrl);
    const local = u.origin === ORIGIN || /^(localhost|127\.0\.0\.1)$/.test(u.hostname);
    if (!local) return u.href;
    let path = u.pathname.replace(/\/index\.html$/i, '/').replace(/\.html$/i, '');
    if (!path) path = '/';
    return path + u.search + u.hash;
  } catch (e) {
    return h;
  }
}

function makeImg(document, img, pageUrl) {
  const out = document.createElement('img');
  out.setAttribute('src', absImageSrc(img.getAttribute('src') || img.getAttribute('data-src'), pageUrl));
  out.setAttribute('alt', img.getAttribute('alt') || '');
  return out;
}

function cloneAs(document, el, tag, pageUrl) {
  const out = document.createElement(tag || el.tagName.toLowerCase());
  [...el.childNodes].forEach((n) => out.append(n.cloneNode(true)));
  out.querySelectorAll('a[href]').forEach((a) => a.setAttribute('href', fixHref(a.getAttribute('href'), pageUrl)));
  return out;
}

const slug = (s) => (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Card -> [img, tag p, h3 > a, description p] */
function cardContent(document, card, pageUrl) {
  const out = [];
  const href = card.tagName === 'A'
    ? card.getAttribute('href')
    : (card.querySelector('a[href]') && card.querySelector('a[href]').getAttribute('href'));

  const img = card.querySelector('img');
  if (img) out.push(makeImg(document, img, pageUrl));

  const tag = card.querySelector('.tag');
  if (tag && tag.textContent.trim()) {
    const p = document.createElement('p');
    p.textContent = tag.textContent.trim();
    out.push(p);
  }

  const heading = card.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) {
    const h3 = document.createElement('h3');
    const text = heading.textContent.replace(/\s+/g, ' ').trim();
    if (href) {
      const a = document.createElement('a');
      a.setAttribute('href', fixHref(href, pageUrl));
      a.textContent = text;
      h3.append(a);
    } else {
      h3.textContent = text;
    }
    out.push(h3);
  }

  [...card.querySelectorAll('p')]
    .filter((p) => !p.matches('.tag') && p.textContent.trim())
    .forEach((p) => out.push(cloneAs(document, p, 'p', pageUrl)));

  return out;
}

function paneContent(document, pane, pageUrl) {
  const cards = [...pane.querySelectorAll('a.article-card, div.article-card')]
    .filter((c, i, all) => !all.some((o) => o !== c && o.contains(c)));
  if (cards.length) {
    return cards.reduce((acc, card) => acc.concat(cardContent(document, card, pageUrl)), []);
  }
  // Fallback: free-form pane content
  const out = [];
  [...pane.querySelectorAll('img, p, h1, h2, h3, h4, h5, h6, ul, ol')]
    .filter((el, i, all) => !all.some((o) => o !== el && o.contains(el)))
    .forEach((el) => {
      if (el.tagName === 'IMG') out.push(makeImg(document, el, pageUrl));
      else if (el.textContent.trim()) out.push(cloneAs(document, el, null, pageUrl));
    });
  return out;
}

export default function parse(element, { document }) {
  const pageUrl = getPageUrl(document, arguments[1]);
  const cells = [];

  const buttons = [...element.querySelectorAll('.tab-menu .tab-menu-link, [role="tab"]')]
    .filter((b, i, all) => all.indexOf(b) === i);
  const panes = [...element.querySelectorAll('.tab-pane')];
  const used = new Set();

  buttons.forEach((btn, i) => {
    const label = btn.textContent.replace(/\s+/g, ' ').trim();
    const key = btn.getAttribute('data-tab') || btn.getAttribute('aria-controls') || btn.getAttribute('data-target');
    let pane = null;
    if (key) {
      const k = key.replace(/^#/, '');
      pane = panes.find((p) => p.id === k || p.getAttribute('data-tab') === k);
    }
    if (!pane) {
      const s = slug(label);
      pane = panes.find((p) => !used.has(p) && (p.id === `tab-${s}` || p.id === s || p.getAttribute('data-tab') === s));
    }
    if (!pane) pane = panes.filter((p) => !used.has(p))[0] || null;
    if (pane) used.add(pane);

    const content = pane ? paneContent(document, pane, pageUrl) : [];
    cells.push([label, content.length ? content : '']);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'tabs-cards', cells });
  element.replaceWith(block);
}
