/**
 * cards-text: bordered text-only cards in a wrapping grid (3 columns by default).
 * Each row is one card with a single text cell: optional tag paragraph, heading
 * (h3/h4), description, optional link (styled as a ghost CTA when authored in italics).
 * Extra cells in a row are merged into the same card. Option `two-col` gives 2 columns.
 */
export default function decorate(block) {
  const ul = document.createElement('ul');
  ul.className = 'cards-text-list';

  [...block.children].forEach((row) => {
    const cells = [...row.children].filter((c) => c.textContent.trim() || c.children.length);
    if (!cells.length) return;

    const li = document.createElement('li');
    li.className = 'cards-text-card';
    const body = document.createElement('div');
    body.className = 'cards-text-card-body';

    cells.forEach((cell) => {
      if (cell.children.length) {
        body.append(...cell.childNodes);
      } else {
        // a cell with bare text and no element children
        const p = document.createElement('p');
        p.append(...cell.childNodes);
        body.append(p);
      }
    });

    const heading = body.querySelector('h1, h2, h3, h4, h5, h6');
    const prev = heading?.previousElementSibling;
    if (prev && prev.tagName === 'P' && !prev.querySelector('a, picture')) {
      prev.classList.add('cards-text-card-tag');
    }

    // a trailing paragraph holding only a link is the card's CTA
    const last = body.lastElementChild;
    const lastLink = last?.querySelector('a[href]');
    const linkOnly = lastLink && last.textContent.trim() === lastLink.textContent.trim();
    if (last && last !== heading && linkOnly) {
      last.classList.add('cards-text-card-cta');
    }

    li.append(body);
    ul.append(li);
  });

  block.replaceChildren(ul);
}
