/* eslint-disable */
/* global WebImporter */

/**
 * Parser: cards-text
 * Source: div.grid-layout > div.card.card-body (p.tag, h3/h4, p, optional a.button--ghost)
 * Target: one row per card, one text cell: [tag p, heading, paragraph(s), CTA].
 *   a.button--ghost -> <em> link, a.button -> <strong> link, a.accent-button -> <strong><em> link,
 *   a.text-button -> plain link.
 * Option: grid-layout--2col -> block "Cards Text (two-col)".
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

function cloneAs(document, el, tag, pageUrl) {
  const out = document.createElement(tag || el.tagName.toLowerCase());
  [...el.childNodes].forEach((n) => out.append(n.cloneNode(true)));
  out.querySelectorAll('a[href]').forEach((a) => a.setAttribute('href', fixHref(a.getAttribute('href'), pageUrl)));
  return out;
}

const CTA_SEL = 'a.button, a.accent-button, a.button--ghost, a.text-button';

export default function parse(element, { document }) {
  const pageUrl = getPageUrl(document, arguments[1]);
  const cells = [];

  let cards = [...element.querySelectorAll(':scope > div.card.card-body')];
  if (!cards.length) cards = [...element.querySelectorAll('div.card.card-body')];

  cards.forEach((card) => {
    const content = [];
    [...card.querySelectorAll(`p, h1, h2, h3, h4, h5, h6, ul, ol, div.tag, ${CTA_SEL}`)]
      .filter((el, i, all) => !all.some((o) => o !== el && o.contains(el)))
      .forEach((el) => {
        if (el.matches(CTA_SEL)) {
          const cta = makeCta(document, el, pageUrl);
          if (cta) content.push(cta);
          return;
        }
        if (!el.textContent.trim()) return;
        if (/^(H[1-6]|UL|OL)$/.test(el.tagName)) content.push(cloneAs(document, el, null, pageUrl));
        else content.push(cloneAs(document, el, 'p', pageUrl));
      });
    if (content.length) cells.push([content]);
  });

  const twoCol = element.classList.contains('grid-layout--2col');
  const name = twoCol ? 'Cards Text (two-col)' : 'cards-text';
  const block = WebImporter.Blocks.createBlock(document, { name, cells });
  element.replaceWith(block);
}
