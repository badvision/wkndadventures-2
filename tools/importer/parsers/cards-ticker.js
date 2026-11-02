/* eslint-disable */
/* global WebImporter */

/**
 * Parser: cards-ticker
 * Source: div.ticker-strip > div.ticker-track > span (items), span.ticker-sep (separators)
 *         The source repeats the list for a seamless loop; the block duplicates it itself,
 *         so each word is kept once.
 * The html2md pre-processing may unwrap the <span>s into plain text, so the track is read
 * node by node: element children are items, text runs are split on separator dots / newlines.
 * Target: one row per unique ticker word, one text cell (Cards no-images model).
 */
const SEP_SPLIT = /\s*[·•|]\s*|\s*\n\s*/;

function collect(node, out) {
  node.childNodes.forEach((n) => {
    if (n.nodeType === 3) {
      n.textContent.split(SEP_SPLIT).forEach((t) => out.push(t));
      return;
    }
    if (n.nodeType !== 1) return;
    if (n.matches('.ticker-sep')) return;
    // nested wrappers (e.g. an inner list) are walked; leaf items are taken whole
    if (n.children.length) collect(n, out);
    else out.push(n.textContent);
  });
}

export default function parse(element, { document }) {
  const cells = [];
  const seen = new Set();

  const track = element.querySelector('.ticker-track') || element;
  const raw = [];
  collect(track, raw);

  raw.forEach((t) => {
    const text = (t || '').replace(/\s+/g, ' ').trim();
    if (!text || /^[·•|\-–—]+$/.test(text)) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    cells.push([text]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-ticker', cells });
  element.replaceWith(block);
}
