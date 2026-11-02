import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Optimize same-origin, non-SVG images only. External (not yet uploaded) and SVG
 * images keep their authored <picture>.
 */
function optimizeImages(root, eager, breakpoints = [
  { media: '(min-width: 900px)', width: '2000' },
  { width: '900' },
]) {
  root.querySelectorAll('picture > img').forEach((img) => {
    const url = new URL(img.src, window.location.href);
    if (url.origin !== window.location.origin || /\.svg$/i.test(url.pathname)) return;
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, eager, breakpoints));
  });
}

const BYLINE_TEXT_MAX = 120;

function isBylineText(el) {
  return el && el.tagName === 'P' && !el.querySelector('a, picture, img')
    && el.textContent.trim() && el.textContent.trim().length <= BYLINE_TEXT_MAX;
}

/**
 * Group the first picture after the heading plus the short non-link paragraphs that
 * follow it into a .hero-full-byline row. Leaves the content untouched when the
 * pattern is absent (heroes without a byline).
 */
function buildByline(content, heading) {
  const avatarPic = [...content.querySelectorAll('picture')]
    // eslint-disable-next-line no-bitwise
    .find((pic) => heading.compareDocumentPosition(pic) & Node.DOCUMENT_POSITION_FOLLOWING);
  if (!avatarPic) return;

  // the top-level content child that holds the avatar; it must hold nothing else
  let avatarEl = avatarPic;
  while (avatarEl.parentElement && avatarEl.parentElement !== content) {
    avatarEl = avatarEl.parentElement;
  }
  if (avatarEl.parentElement !== content) return;
  if (avatarEl !== avatarPic && (avatarEl.textContent.trim()
    || avatarEl.querySelectorAll('picture').length !== 1)) return;

  const texts = [];
  let next = avatarEl.nextElementSibling;
  while (isBylineText(next) && texts.length < 3) {
    texts.push(next);
    next = next.nextElementSibling;
  }
  if (!texts.length) return;

  const byline = document.createElement('div');
  byline.className = 'hero-full-byline';
  const avatar = document.createElement('div');
  avatar.className = 'hero-full-byline-avatar';
  const text = document.createElement('div');
  text.className = 'hero-full-byline-text';

  avatarEl.before(byline);
  avatar.append(avatarPic);
  if (avatarEl !== avatarPic) avatarEl.remove();
  texts[0].classList.add('hero-full-byline-name');
  texts.slice(1).forEach((p) => p.classList.add('hero-full-byline-meta'));
  text.append(...texts);
  byline.append(avatar, text);

  optimizeImages(avatar, true, [{ width: '96' }]);
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

  // optional byline: a picture after the heading followed by short plain paragraphs
  // (name, date · read time) becomes an avatar + text row
  if (heading) {
    buildByline(content, heading);
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

  // the background of a hero in the first section is the LCP element: load it eagerly
  // at high priority; heroes further down the page load lazily
  const section = block.closest('.section');
  const isLcp = !section || section === section.parentElement.querySelector(':scope > .section');
  optimizeImages(media, isLcp);
  const bgImg = media.querySelector('img');
  if (bgImg) {
    bgImg.setAttribute('loading', isLcp ? 'eager' : 'lazy');
    if (isLcp) bgImg.setAttribute('fetchpriority', 'high');
  }

  const inner = document.createElement('div');
  inner.className = 'hero-full-inner';
  inner.append(content);
  block.replaceChildren(...(picture ? [media] : []), inner);
}
