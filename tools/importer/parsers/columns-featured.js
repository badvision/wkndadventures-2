/* eslint-disable */
/* global WebImporter */

/**
 * Parser: columns-featured
 * Sources:
 *   - div.featured-article: [div|a.featured-article-image > img] [div: p.tag, h2, p, a.button]
 *   - div.grid-layout.tablet-1-column: [div: heading, paragraphs] [img]
 * Target: one row, two cells, kept in source order:
 *   image cell = img only; text cell = eyebrow p, heading, paragraphs, CTA link.
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

function linkText(a) {
  const label = a.querySelector('.button-label');
  return (label ? label.textContent : a.textContent).replace(/\s+/g, ' ').trim();
}

function makeCta(document, a, pageUrl) {
  const text = linkText(a);
  if (!text) return null;
  const link = document.createElement('a');
  link.setAttribute('href', fixHref(a.getAttribute('href'), pageUrl));
  link.textContent = text;
  const p = document.createElement('p');
  if (a.matches('.button--ghost')) {
    const em = document.createElement('em');
    em.append(link);
    p.append(em);
  } else if (a.matches('.button, .accent-button')) {
    const strong = document.createElement('strong');
    strong.append(link);
    p.append(strong);
  } else {
    p.append(link);
  }
  return p;
}

function cloneAs(document, el, tag, pageUrl) {
  const out = document.createElement(tag || el.tagName.toLowerCase());
  [...el.childNodes].forEach((n) => out.append(n.cloneNode(true)));
  out.querySelectorAll('a[href]').forEach((a) => a.setAttribute('href', fixHref(a.getAttribute('href'), pageUrl)));
  return out;
}

const CTA_SEL = 'a.button, a.accent-button, a.button--ghost, a.text-button';

/** Text column: tag/paragraphs, headings, lists and CTA links in document order. */
function buildText(document, container, pageUrl) {
  const out = [];
  const parts = [...container.querySelectorAll(`p, h1, h2, h3, h4, h5, h6, ul, ol, div.tag, ${CTA_SEL}`)]
    .filter((el, i, all) => !all.some((o) => o !== el && o.contains(el)));
  parts.forEach((el) => {
    if (el.matches(CTA_SEL)) {
      const cta = makeCta(document, el, pageUrl);
      if (cta) out.push(cta);
      return;
    }
    if (!el.textContent.trim()) return;
    if (/^(H[1-6]|UL|OL)$/.test(el.tagName)) {
      out.push(cloneAs(document, el, null, pageUrl));
      return;
    }
    out.push(cloneAs(document, el, 'p', pageUrl));
  });
  return out;
}

export default function parse(element, { document }) {
  const pageUrl = getPageUrl(document, arguments[1]);
  const row = [];

  [...element.children].forEach((child) => {
    const img = child.tagName === 'IMG' ? child : child.querySelector('img');
    const hasText = !!child.textContent.trim();
    if (img && !hasText) {
      row.push(makeImg(document, img, pageUrl));
      return;
    }
    const text = buildText(document, child, pageUrl);
    if (text.length) row.push(text);
  });

  // Keep the fixed two-column shape: pad a missing cell.
  while (row.length < 2) row.push('');

  const cells = [row];
  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-featured', cells });
  element.replaceWith(block);
}
