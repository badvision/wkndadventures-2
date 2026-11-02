/* eslint-disable */
/* global WebImporter */

/**
 * WKND Adventures cleanup transformer.
 * Removes non-authorable site chrome and decorative markup.
 * Selectors verified against migration-work/cleaned.html.
 */

function removeAll(root, selectors) {
  selectors.forEach((sel) => {
    root.querySelectorAll(sel).forEach((el) => el.remove());
  });
}

/**
 * The source ticker repeats its item list twice for a seamless CSS loop
 * (not marked aria-hidden). The cards-ticker block duplicates the list
 * itself, so keep each item once: drop the second half only when it is an
 * exact repeat of the first half.
 */
function dedupeTicker(root) {
  root.querySelectorAll('div.ticker-track').forEach((track) => {
    // Explicitly hidden duplicates (if the source ever marks them).
    track.querySelectorAll('[aria-hidden="true"]').forEach((el) => el.remove());
    const items = [...track.children].filter((el) => !el.classList.contains('ticker-sep'));
    if (items.length < 2 || items.length % 2 !== 0) return;
    const half = items.length / 2;
    const text = (el) => el.textContent.trim();
    const isRepeat = items.slice(0, half).every((el, i) => text(el) === text(items[half + i]));
    if (isRepeat) items.slice(half).forEach((el) => el.remove());
  });
}

export default function transform(hookName, element, payload) {
  if (hookName === 'beforeTransform') {
    // Site chrome that could otherwise be matched by block parsers.
    removeAll(element, [
      'a.skip-link',
      'div.navbar',
      'nav.nav-menu',
      'button.nav-mobile-menu-button',
      'footer.footer',
      'footer.inverse-footer',
      // Decorative hero overlay
      'div.hero-bg > div.overlay',
      // Ticker separators: the cards-ticker block renders its own
      'div.ticker-track > span.ticker-sep',
    ]);
    dedupeTicker(element);
  }

  if (hookName === 'afterTransform') {
    removeAll(element, [
      'header',
      'footer',
      'nav',
      'script',
      'style',
      'noscript',
      'link',
      'iframe',
    ]);
    // Tracking / interaction attributes left on authorable elements.
    element.querySelectorAll('[onclick], [data-track], [data-analytics]').forEach((el) => {
      el.removeAttribute('onclick');
      el.removeAttribute('data-track');
      el.removeAttribute('data-analytics');
    });
  }
}
