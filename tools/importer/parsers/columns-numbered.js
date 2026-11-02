/* eslint-disable */
/* global WebImporter */

/**
 * Parser: columns-numbered
 * Source: div.editorial-index > div.editorial-index-item
 *           > span.editorial-index-number + div (h3, p)
 * The html2md pre-processing may unwrap the number <span> into a bare text node, so the
 * number falls back to the item's direct text.
 * Target: one row per item: [number] [h3, p].
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

function cloneAs(document, el, tag, pageUrl) {
  const out = document.createElement(tag || el.tagName.toLowerCase());
  [...el.childNodes].forEach((n) => out.append(n.cloneNode(true)));
  out.querySelectorAll('a[href]').forEach((a) => a.setAttribute('href', fixHref(a.getAttribute('href'), pageUrl)));
  return out;
}

export default function parse(element, { document }) {
  const pageUrl = getPageUrl(document, arguments[1]);
  const cells = [];

  element.querySelectorAll('.editorial-index-item').forEach((item) => {
    const numEl = item.querySelector('.editorial-index-number');
    let number = numEl ? numEl.textContent.trim() : '';
    if (!number) {
      number = [...item.childNodes]
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent.trim())
        .filter(Boolean)[0] || '';
    }

    const text = [];
    [...item.querySelectorAll('h1, h2, h3, h4, h5, h6, p, ul, ol')]
      .filter((el) => !(numEl && numEl.contains(el)))
      .filter((el, i, all) => !all.some((o) => o !== el && o.contains(el)))
      .forEach((el) => {
        if (el.textContent.trim()) text.push(cloneAs(document, el, null, pageUrl));
      });

    if (!number && !text.length) return;
    cells.push([number, text.length ? text : '']);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-numbered', cells });
  element.replaceWith(block);
}
