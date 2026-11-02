/* eslint-disable */
/* global WebImporter */

/**
 * Parser: cards-gallery
 * Source: div.grid-layout.grid-images > img.gallery-img (optionally wrapped)
 * Target: one row per image, one image cell.
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

function makeImg(document, img, pageUrl) {
  const out = document.createElement('img');
  out.setAttribute('src', absImageSrc(img.getAttribute('src') || img.getAttribute('data-src'), pageUrl));
  out.setAttribute('alt', img.getAttribute('alt') || '');
  return out;
}

export default function parse(element, { document }) {
  const pageUrl = getPageUrl(document, arguments[1]);
  const cells = [];

  element.querySelectorAll('img').forEach((img) => {
    if (!img.getAttribute('src') && !img.getAttribute('data-src')) return;
    cells.push([makeImg(document, img, pageUrl)]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-gallery', cells });
  element.replaceWith(block);
}
