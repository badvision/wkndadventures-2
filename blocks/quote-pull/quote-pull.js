/**
 * Move a cell's content into a target element, wrapping loose inline/text nodes in <p>.
 * @param {Element} cell source cell
 * @param {Element} target destination element
 */
function moveParagraphs(cell, target) {
  let loose = null;
  [...cell.childNodes].forEach((node) => {
    const isBlockEl = node.nodeType === Node.ELEMENT_NODE
      && /^(P|H[1-6]|UL|OL|DIV|PICTURE|BLOCKQUOTE)$/.test(node.tagName);
    if (isBlockEl) {
      loose = null;
      target.append(node);
    } else if (node.nodeType === Node.ELEMENT_NODE || node.textContent.trim()) {
      if (!loose) {
        loose = document.createElement('p');
        target.append(loose);
      }
      loose.append(node);
    }
  });
}

/**
 * quote-pull: a quotation with an optional attribution.
 * Authored rows: [quotation] / [attribution]. Authors may put both in one row as two
 * cells, or omit the attribution. Renders
 * figure > blockquote > p + figcaption > cite (attribution sits outside the blockquote,
 * as the HTML spec requires).
 * @param {Element} block the block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  const cells = rows.flatMap((row) => [...row.children]);
  if (!cells.length) return;

  let quoteCell = cells[0];
  let attributionCell = cells[1] || null;
  // tolerate an empty leading cell
  if (!quoteCell.textContent.trim() && attributionCell) {
    quoteCell = attributionCell;
    attributionCell = cells[2] || null;
  }

  const figure = document.createElement('figure');
  figure.className = 'quote-pull-figure';

  const quote = document.createElement('blockquote');
  quote.className = 'quote-pull-quotation';
  moveParagraphs(quoteCell, quote);
  // a nested authored <blockquote> is unwrapped so the quote is not double-indented
  quote.querySelectorAll('blockquote').forEach((bq) => bq.replaceWith(...bq.childNodes));
  if (!quote.textContent.trim()) return;
  figure.append(quote);

  if (attributionCell && attributionCell.textContent.trim()) {
    const caption = document.createElement('figcaption');
    caption.className = 'quote-pull-attribution';
    const cite = document.createElement('cite');
    // flatten paragraphs into the cite, keeping inline markup such as links
    [...attributionCell.childNodes].forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'P') {
        if (cite.childNodes.length) cite.append(document.createElement('br'));
        cite.append(...node.childNodes);
      } else {
        cite.append(node);
      }
    });
    // the leading dash is presentational; CSS adds it back
    const first = cite.firstChild;
    if (first && first.nodeType === Node.TEXT_NODE) {
      first.textContent = first.textContent.replace(/^\s*[—–-]+\s*/, '');
    }
    caption.append(cite);
    figure.append(caption);
  } else {
    block.classList.add('quote-pull-no-attribution');
  }

  block.replaceChildren(figure);
}
