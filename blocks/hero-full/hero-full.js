import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Optimize same-origin, non-SVG images only. External (not yet uploaded) and SVG
 * images keep their authored <picture>.
 */
function optimizeImages(root, eager) {
  root.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, eager, [
      { media: '(min-width: 900px)', width: '2000' },
      { width: '900' },
    ]));
  });
}

/**
 * hero-full: full-bleed background image with overlaid eyebrow, heading, lead and CTAs.
 * Authored rows: [background image] / [text content]. Authors may merge both into one
 * cell or omit the image; the first picture found becomes the background.
 */
export default function decorate(block) {
  const media = document.createElement('div');
  media.className = 'hero-full-media';
  const content = document.createElement('div');
  content.className = 'hero-full-content';

  const picture = block.querySelector('picture');
  if (picture) {
    const wrapper = picture.parentElement;
    media.append(picture);
    // drop the now-empty <p> that wrapped the picture
    if (wrapper && wrapper.tagName === 'P' && !wrapper.textContent.trim() && !wrapper.children.length) {
      wrapper.remove();
    }
  }

  [...block.children].forEach((row) => {
    [...row.children].forEach((cell) => {
      content.append(...cell.childNodes);
    });
  });

  // first plain paragraph before the heading is the eyebrow tag
  const heading = content.querySelector('h1, h2, h3');
  if (heading) {
    const prev = heading.previousElementSibling;
    if (prev && prev.tagName === 'P' && !prev.querySelector('a, picture')) {
      prev.classList.add('hero-full-eyebrow');
    }
  }

  // group consecutive CTA paragraphs
  const ctas = [...content.children].filter((el) => el.tagName === 'P'
    && el.querySelector('a') && el.textContent.trim() === el.querySelector('a').textContent.trim()
    && el.textContent.trim());
  if (ctas.length) {
    const group = document.createElement('div');
    group.className = 'hero-full-actions';
    ctas[0].before(group);
    group.append(...ctas);
  }

  if (!picture) block.classList.add('hero-full-no-image');
  optimizeImages(media, true);

  const inner = document.createElement('div');
  inner.className = 'hero-full-inner';
  inner.append(content);
  block.replaceChildren(...(picture ? [media] : []), inner);
}
