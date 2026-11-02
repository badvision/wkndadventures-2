/* eslint-disable */
/* global WebImporter */

/**
 * Parser: accordion-faq
 * Source: div.faq-list > div.faq-item > button.faq-question (span text + span.faq-icon)
 *                                      + div.faq-answer (text or paragraphs)
 * Target: one row per question: [question] [answer content].
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

const BLOCK_TAGS = /^(P|UL|OL|H[1-6]|BLOCKQUOTE|TABLE|DIV)$/;

function answerContent(document, answer, pageUrl) {
  const out = [];
  let para = null;
  const flush = () => {
    if (para && para.textContent.trim()) out.push(para);
    para = null;
  };
  [...answer.childNodes].forEach((n) => {
    if (n.nodeType === 1 && BLOCK_TAGS.test(n.tagName)) {
      flush();
      if (!n.textContent.trim()) return;
      const clone = n.tagName === 'DIV' ? document.createElement('p') : n.cloneNode(false);
      [...n.childNodes].forEach((c) => clone.append(c.cloneNode(true)));
      out.push(clone);
      return;
    }
    if (n.nodeType !== 1 && n.nodeType !== 3) return;
    if (!para) para = document.createElement('p');
    para.append(n.cloneNode(true));
  });
  flush();
  out.forEach((el) => el.querySelectorAll('a[href]').forEach((a) => a.setAttribute('href', fixHref(a.getAttribute('href'), pageUrl))));
  return out;
}

export default function parse(element, { document }) {
  const pageUrl = getPageUrl(document, arguments[1]);
  const cells = [];

  element.querySelectorAll('.faq-item').forEach((item) => {
    const q = item.querySelector('.faq-question');
    if (!q) return;
    const icon = q.querySelector('.faq-icon');
    let question = q.textContent;
    if (icon) question = question.replace(icon.textContent, '');
    question = question.replace(/\s+/g, ' ').trim();
    if (!question) return;

    const answer = item.querySelector('.faq-answer');
    const content = answer ? answerContent(document, answer, pageUrl) : [];
    cells.push([question, content.length ? content : '']);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'accordion-faq', cells });
  element.replaceWith(block);
}
