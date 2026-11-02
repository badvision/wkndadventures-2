import { createOptimizedPicture } from '../../scripts/aem.js';

function optimizeImages(root) {
  root.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '900' }]));
  });
}

function isImageOnly(cell) {
  return !!cell.querySelector('picture') && !cell.textContent.trim();
}

/**
 * columns-featured: a single featured story laid out side by side, image | text.
 * Each row is one item: [image] [eyebrow, heading, lead, CTA]. Cell order is not
 * enforced; the image cell is detected. Extra cells are kept as additional text.
 */
export default function decorate(block) {
  [...block.children].forEach((row) => {
    row.classList.add('columns-featured-item');
    const cells = [...row.children];
    cells.forEach((cell) => {
      if (isImageOnly(cell)) {
        cell.classList.add('columns-featured-image');
      } else {
        cell.classList.add('columns-featured-body');
        const heading = cell.querySelector('h1, h2, h3, h4');
        const prev = heading?.previousElementSibling;
        if (prev && prev.tagName === 'P' && !prev.querySelector('a, picture')) {
          prev.classList.add('columns-featured-eyebrow');
        }
      }
      if (!cell.children.length && !cell.textContent.trim()) cell.remove();
    });
    if (!row.querySelector('.columns-featured-image')) row.classList.add('columns-featured-text-only');
  });
  optimizeImages(block);
}
