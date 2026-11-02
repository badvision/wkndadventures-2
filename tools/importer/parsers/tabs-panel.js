/* eslint-disable */
/* global WebImporter */

/**
 * Parser: tabs-panel
 * Source: div.tab-menu (direct child of the section, NOT inside div.tab-container)
 *           > button.tab-menu-link (labels)
 *         followed by sibling div.tab-pane elements (one per tab). The panes are consumed
 *         into the block and removed from the page.
 *         Pane: .team-profile-col (img, p.profile-name, optional role p) + .team-profile-bio (p...)
 * Target: one row per tab: [label] [profile image, <strong> name p, role p, bio paragraphs].
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
const TEXT_SEL = 'p, h1, h2, h3, h4, h5, h6, ul, ol';
const topLevel = (els) => els.filter((el, i, all) => !all.some((o) => o !== el && o.contains(el)));

function paneContent(document, pane, pageUrl) {
  const out = [];
  const used = new Set();

  // Profile column: image, name (bold), role line(s)
  const col = pane.querySelector('.team-profile-col');
  const nameEl = pane.querySelector('.profile-name');
  const img = (col && col.querySelector('img')) || pane.querySelector('.profile-circle img');
  if (img) {
    out.push(makeImg(document, img, pageUrl));
    used.add(img);
  }
  if (nameEl && nameEl.textContent.trim()) {
    const p = document.createElement('p');
    const strong = document.createElement('strong');
    strong.textContent = nameEl.textContent.replace(/\s+/g, ' ').trim();
    p.append(strong);
    out.push(p);
    used.add(nameEl);
  }
  if (col) {
    topLevel([...col.querySelectorAll(TEXT_SEL)])
      .filter((el) => !used.has(el) && el.textContent.trim())
      .forEach((el) => {
        out.push(cloneAs(document, el, /^H[1-6]$/.test(el.tagName) ? 'p' : null, pageUrl));
        used.add(el);
      });
  }

  // Remaining content (bio paragraphs, or any free-form pane content) in document order
  topLevel([...pane.querySelectorAll(`img, ${TEXT_SEL}`)])
    .filter((el) => !used.has(el) && !(col && col.contains(el)))
    .forEach((el) => {
      if (el.tagName === 'IMG') out.push(makeImg(document, el, pageUrl));
      else if (el.textContent.trim()) out.push(cloneAs(document, el, null, pageUrl));
    });

  return out;
}

export default function parse(element, { document }) {
  const pageUrl = getPageUrl(document, arguments[1]);
  const cells = [];

  // Panes: the tab-pane siblings that follow the menu.
  const panes = [];
  let sib = element.nextElementSibling;
  while (sib) {
    if (sib.matches('.tab-pane')) panes.push(sib);
    else if (sib.querySelector(':scope > .tab-pane') && !sib.matches('.tab-menu, .tab-container')) {
      panes.push(...sib.querySelectorAll(':scope > .tab-pane'));
    } else if (panes.length) break;
    sib = sib.nextElementSibling;
  }

  const buttons = [...element.querySelectorAll('.tab-menu-link, [role="tab"]')]
    .filter((b, i, all) => all.indexOf(b) === i);
  const used = new Set();

  buttons.forEach((btn) => {
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

  // Consume the panes so their content is not duplicated as default content.
  panes.forEach((p) => p.remove());

  const block = WebImporter.Blocks.createBlock(document, { name: 'tabs-panel', cells });
  element.replaceWith(block);
}
