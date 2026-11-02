/* eslint-disable */
/* global WebImporter */

/**
 * WKND page metadata transformer.
 * - Every page: Template = page template name (EDS adds it as a body class).
 * - Blog articles: Author, Publication Date, Reading Time and Tags from the
 *   hero byline (div.article-byline) and eyebrow (span.tag). The byline stays
 *   visible in the hero; this only adds metadata fields.
 * Values are written to payload.metadata, which the import script merges
 * into the page Metadata block. Keys are lowercase/hyphenated (EDS meta-name
 * form) so getMetadata('template') also matches in the local preview, which
 * does not normalize authored key case the way the EDS pipeline does.
 */

function text(el) {
  return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
}

export default function transform(hookName, element, payload) {
  if (hookName !== 'beforeTransform') return;
  const meta = payload && payload.metadata;
  if (!meta) return;

  if (payload.template && payload.template.name) meta.template = payload.template.name;

  const byline = element.querySelector('section.hero-section .article-byline');
  if (!byline) return;

  const author = text(byline.querySelector('.article-byline-name'));
  if (author) meta.author = author;

  const parts = text(byline.querySelector('.article-byline-meta')).split('·').map((s) => s.trim()).filter(Boolean);
  parts.forEach((part) => {
    if (/\bmin(ute)?s?\b.*read/i.test(part)) meta['reading-time'] = part;
    else if (!meta['publication-date']) meta['publication-date'] = part;
  });

  const tags = text(element.querySelector('section.hero-section .tag')).split('·').map((s) => s.trim()).filter(Boolean);
  if (tags.length) meta.tags = tags.join(', ');
}
