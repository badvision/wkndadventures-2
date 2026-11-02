import { createOptimizedPicture } from '../../scripts/aem.js';

function optimizeImages(root) {
  root.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]));
  });
}

/** An element that holds only a picture (a bare <picture> or a <p> wrapping one). */
function isImageEl(el) {
  if (el.tagName === 'PICTURE') return true;
  return !!el.querySelector('picture') && !el.textContent.trim();
}

/** A cell whose only content is a picture. */
function isImageCell(cell) {
  return !!cell.querySelector('picture') && !cell.textContent.trim();
}

function buildMedia(source) {
  const picture = source.tagName === 'PICTURE' ? source : source.querySelector('picture');
  if (!picture) return null;
  const media = document.createElement('div');
  media.className = 'cards-article-card-image';
  media.append(picture);
  return media;
}

/**
 * cards-article: grid of bordered article cards, each linking to a detail page.
 * Each row is one card: [image] [text: optional tag paragraph, heading linked to the
 * article, description]. Rows may omit the image cell, put the image at the top of
 * the text cell, or omit the link (the card is then not clickable).
 */
export default function decorate(block) {
  const ul = document.createElement('ul');
  ul.className = 'cards-article-list';

  [...block.children].forEach((row) => {
    const cells = [...row.children].filter((c) => c.textContent.trim() || c.children.length);
    if (!cells.length) return;

    const li = document.createElement('li');
    li.className = 'cards-article-card';

    let media = null;
    const bodyEls = [];
    cells.forEach((cell) => {
      if (!media && isImageCell(cell)) {
        media = buildMedia(cell);
        return;
      }
      [...cell.children].forEach((el) => {
        // an image leading the text cell becomes the card image
        if (!media && !bodyEls.length && isImageEl(el)) {
          media = buildMedia(el);
          el.remove();
          return;
        }
        bodyEls.push(el);
      });
      // a text cell with bare text and no element children
      if (!cell.children.length && cell.textContent.trim()) {
        const p = document.createElement('p');
        p.append(...cell.childNodes);
        bodyEls.push(p);
      }
    });

    if (media) li.append(media);

    if (bodyEls.length) {
      const body = document.createElement('div');
      body.className = 'cards-article-card-body';
      body.append(...bodyEls);

      const heading = body.querySelector('h1, h2, h3, h4, h5, h6');
      const prev = heading?.previousElementSibling;
      if (prev && prev.tagName === 'P' && !prev.querySelector('a, picture')) {
        prev.classList.add('cards-article-card-tag');
      }

      // the heading link (or the first link) stretches over the whole card
      const link = heading?.querySelector('a[href]') || body.querySelector('a[href]');
      if (link) {
        link.classList.add('cards-article-card-link');
        li.classList.add('cards-article-card-linked');
      }
      li.append(body);
    }

    if (li.children.length) ul.append(li);
  });

  optimizeImages(ul);
  block.replaceChildren(ul);
}
