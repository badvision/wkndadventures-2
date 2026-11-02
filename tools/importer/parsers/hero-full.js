/* eslint-disable */
/* global WebImporter */

/**
 * Parser: hero-full
 * Source: section.hero-section--full, blog section.hero-section (with byline)
 * Target rows:
 *   1. [background image]            (div.hero-bg img)
 *   2. [eyebrow p, h1, lead p, CTAs]  (p.tag, h1, p.hero-lead, a.button / a.accent-button /
 *                                       a.button--ghost / a.text-button)
 * CTA styles: primary (a.button) -> <strong>, accent (a.accent-button) -> <strong><em>,
 * ghost (a.button--ghost) -> <em> link, text (a.text-button) -> plain link.
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
  } else if (a.matches('.accent-button')) {
    // accent (orange) CTA -> bold + italic, EDS "accent" button
    const strong = document.createElement('strong');
    const em = document.createElement('em');
    em.append(link);
    strong.append(em);
    p.append(strong);
  } else if (a.matches('.button')) {
    const strong = document.createElement('strong');
    strong.append(link);
    p.append(strong);
  } else {
    p.append(link);
  }
  return p;
}

/** Clone an element's inline content into a fresh element, fixing links. */
function cloneAs(document, el, tag, pageUrl) {
  const out = document.createElement(tag || el.tagName.toLowerCase());
  [...el.childNodes].forEach((n) => out.append(n.cloneNode(true)));
  out.querySelectorAll('a[href]').forEach((a) => a.setAttribute('href', fixHref(a.getAttribute('href'), pageUrl)));
  return out;
}

export default function parse(element, { document }) {
  const pageUrl = getPageUrl(document, arguments[1]);
  const cells = [];

  // Row 1: background image
  const bgImg = element.querySelector('.hero-bg img') || element.querySelector('img');
  if (bgImg) cells.push([makeImg(document, bgImg, pageUrl)]);

  // Row 2: text content
  const content = [];
  const inner = element.querySelector('.hero-content-inner, .hero-content') || element;
  // span.tag is the eyebrow on blog heroes; .article-byline .avatar img is
  // the author avatar (followed by name/meta paragraphs) on blog heroes.
  const parts = [...inner.querySelectorAll('p, span.tag, h1, h2, h3, h4, h5, h6, .article-byline img, a.button, a.accent-button, a.button--ghost, a.text-button')]
    .filter((el) => el !== bgImg && !(bgImg && el.contains(bgImg)))
    // drop nodes nested inside another matched node (e.g. a link inside a p)
    .filter((el, i, all) => !all.some((o) => o !== el && o.contains(el)));

  parts.forEach((el) => {
    if (el.tagName === 'IMG') {
      content.push(makeImg(document, el, pageUrl));
      return;
    }
    if (el.tagName === 'A') {
      const cta = makeCta(document, el, pageUrl);
      if (cta) content.push(cta);
      return;
    }
    if (!el.textContent.trim()) return;
    if (/^H[1-6]$/.test(el.tagName)) {
      content.push(cloneAs(document, el, null, pageUrl));
      return;
    }
    content.push(cloneAs(document, el, 'p', pageUrl));
  });

  if (content.length) cells.push([content]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-full', cells });
  element.replaceWith(block);
}
