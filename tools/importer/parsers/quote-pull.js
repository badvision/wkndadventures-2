/* eslint-disable */
/* global WebImporter */

/**
 * Parser: quote-pull
 * Source: blockquote.pull-quote (p.pull-quote-body + cite.pull-quote-attribution)
 *         and inline div.blog-content-body blockquote (p only)
 * Target rows:
 *   1. [quotation paragraphs]
 *   2. [attribution]  (only when the source has a cite)
 */

export default function parse(element, { document }) {
  const cells = [];

  const cite = element.querySelector('cite, .pull-quote-attribution, footer');
  const paragraphs = [...element.querySelectorAll('p')]
    .filter((p) => !(cite && cite.contains(p)))
    .filter((p) => p.textContent.trim());

  const quote = [];
  if (paragraphs.length) {
    paragraphs.forEach((p) => {
      const out = document.createElement('p');
      [...p.childNodes].forEach((n) => out.append(n.cloneNode(true)));
      quote.push(out);
    });
  } else {
    const text = [...element.childNodes]
      .filter((n) => !(cite && (n === cite || n.contains(cite))))
      .map((n) => n.textContent)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text) {
      const out = document.createElement('p');
      out.textContent = text;
      quote.push(out);
    }
  }
  if (!quote.length) return;
  cells.push([quote]);

  if (cite) {
    const attribution = cite.textContent.replace(/\s+/g, ' ').trim();
    if (attribution) {
      const p = document.createElement('p');
      p.textContent = attribution;
      cells.push([p]);
    }
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'quote-pull', cells });
  element.replaceWith(block);
}
