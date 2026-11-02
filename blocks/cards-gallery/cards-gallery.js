import { createOptimizedPicture } from '../../scripts/aem.js';

function optimizeImages(root) {
  root.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [
      { media: '(min-width: 900px)', width: '1200' },
      { width: '750' },
    ]));
  });
}

/**
 * cards-gallery: image-only cards in a 3-column rounded-image grid.
 * Each row is one item: [image] and optionally [caption text]. Rows without an image
 * are kept as text cards. A trailing item that would sit alone in the last desktop
 * row spans the full width (the wide image below the grid on the source page).
 */
export default function decorate(block) {
  const ul = document.createElement('ul');
  ul.className = 'cards-gallery-list';

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'cards-gallery-item';
    [...row.children].forEach((cell) => {
      if (!cell.textContent.trim() && !cell.children.length) return;
      if (cell.querySelector('picture') && !cell.textContent.trim()) {
        cell.className = 'cards-gallery-image';
      } else {
        cell.className = 'cards-gallery-caption';
      }
      li.append(cell);
    });
    if (li.children.length) ul.append(li);
  });

  const count = ul.children.length;
  if (count > 3 && count % 3 === 1) ul.lastElementChild.classList.add('cards-gallery-item-wide');

  optimizeImages(ul);
  block.replaceChildren(ul);
}
