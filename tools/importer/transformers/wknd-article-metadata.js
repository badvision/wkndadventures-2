/* eslint-disable */
/* global WebImporter */

/**
 * WKND page metadata transformer.
 * - Every page: Template = page template name (EDS adds it as a body class).
 * - Blog articles: Author, Publication Date, Reading Time and Tags from the
 *   hero byline (div.article-byline) and eyebrow (span.tag). The byline stays
 *   visible in the hero; this only adds metadata fields.
 * Values are written to payload.metadata, which the import script merges
 * into the page Metadata block.
 */

function text(el) {
  return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
}

export default function transform(hookName, element, payload) {
  if (hookName !== 'beforeTransform') return;
  const meta = payload && payload.metadata;
  if (!meta) return;

  if (payload.template && payload.template.name) meta.Template = payload.template.name;

  const byline = element.querySelector('section.hero-section .article-byline');
  if (!byline) return;

  const author = text(byline.querySelector('.article-byline-name'));
  if (author) meta.Author = author;

  const parts = text(byline.querySelector('.article-byline-meta')).split('·').map((s) => s.trim()).filter(Boolean);
  parts.forEach((part) => {
    if (/\bmin(ute)?s?\b.*read/i.test(part)) meta['Reading Time'] = part;
    else if (!meta['Publication Date']) meta['Publication Date'] = part;
  });

  const tags = text(element.querySelector('section.hero-section .tag')).split('·').map((s) => s.trim()).filter(Boolean);
  if (tags.length) meta.Tags = tags.join(', ');
}
