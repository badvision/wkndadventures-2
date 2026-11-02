/* eslint-disable */
/* global WebImporter */

/**
 * Parser: cards-article
 * Source: div.grid-layout > a.article-card
 *           > div.article-card-image img
 *           + div.article-card-body (div.article-card-meta .tag, h3, p)
 * Target: one row per card: [image] [tag p, h3 > a(card href), description p].
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

export default function parse(element, { document }) {
  const pageUrl = getPageUrl(document, arguments[1]);
  const cells = [];

  let cards = [...element.querySelectorAll(':scope > a.article-card, :scope > div.article-card')];
  if (!cards.length) cards = [...element.querySelectorAll('.article-card')];

  cards.forEach((card) => {
    const href = card.tagName === 'A'
      ? card.getAttribute('href')
      : (card.querySelector('a[href]') && card.querySelector('a[href]').getAttribute('href'));

    const img = card.querySelector('img');
    const imageCell = img ? makeImg(document, img, pageUrl) : '';

    const text = [];
    const tag = card.querySelector('.tag');
    if (tag && tag.textContent.trim()) {
      const p = document.createElement('p');
      p.textContent = tag.textContent.replace(/\s+/g, ' ').trim();
      text.push(p);
    }
    const heading = card.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading) {
      const h3 = document.createElement('h3');
      const label = heading.textContent.replace(/\s+/g, ' ').trim();
      if (href) {
        const a = document.createElement('a');
        a.setAttribute('href', fixHref(href, pageUrl));
        a.textContent = label;
        h3.append(a);
      } else {
        h3.textContent = label;
      }
      text.push(h3);
    }
    [...card.querySelectorAll('p')]
      .filter((p) => !p.matches('.tag') && p.textContent.trim())
      .forEach((p) => text.push(cloneAs(document, p, 'p', pageUrl)));

    if (!imageCell && !text.length) return;
    cells.push([imageCell, text.length ? text : '']);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-article', cells });
  element.replaceWith(block);
}
