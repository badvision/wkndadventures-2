/**
 * columns-numbered: stacked rows of a large index number beside a heading + paragraph.
 * Each row: [number] [heading, paragraph]. If the number cell is missing, the row's
 * position (01, 02, ...) is used instead. Extra cells are appended to the text cell.
 */
export default function decorate(block) {
  const list = document.createElement('ol');
  list.className = 'columns-numbered-list';

  [...block.children].forEach((row, i) => {
    const cells = [...row.children].filter((c) => c.textContent.trim() || c.children.length);
    if (!cells.length) return;

    const item = document.createElement('li');
    item.className = 'columns-numbered-item';

    const number = document.createElement('div');
    number.className = 'columns-numbered-number';
    number.setAttribute('aria-hidden', 'true');

    const body = document.createElement('div');
    body.className = 'columns-numbered-body';

    const first = cells[0];
    const firstIsNumber = cells.length > 1 && !first.querySelector('h1, h2, h3, h4, h5, h6, picture')
      && first.textContent.trim().length <= 6;
    if (firstIsNumber) {
      number.textContent = first.textContent.trim();
      cells.slice(1).forEach((c) => body.append(...c.childNodes));
    } else {
      number.textContent = String(i + 1).padStart(2, '0');
      cells.forEach((c) => body.append(...c.childNodes));
    }

    item.append(number, body);
    list.append(item);
  });

  block.replaceChildren(list);
}
