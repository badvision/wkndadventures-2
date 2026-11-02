/**
 * cards-ticker: text-only items rendered as an infinite horizontal marquee.
 * Each row is one item (one text cell; extra cells are joined). Authors enter each
 * item once; the block duplicates the list (aria-hidden) so the loop is seamless.
 * Users who prefer reduced motion get a static, horizontally scrollable strip.
 */
export default function decorate(block) {
  const items = [...block.children]
    .map((row) => [...row.children].map((c) => c.textContent.trim()).filter(Boolean).join(' '))
    .filter(Boolean);

  if (!items.length) {
    block.replaceChildren();
    return;
  }

  const buildList = (hidden) => {
    const ul = document.createElement('ul');
    ul.className = 'cards-ticker-list';
    if (hidden) ul.setAttribute('aria-hidden', 'true');
    items.forEach((text) => {
      const li = document.createElement('li');
      li.className = 'cards-ticker-item';
      li.textContent = text;
      ul.append(li);
    });
    return ul;
  };

  const track = document.createElement('div');
  track.className = 'cards-ticker-track';
  track.append(buildList(false), buildList(true));
  // keep speed roughly constant regardless of item count
  track.style.setProperty('--cards-ticker-duration', `${Math.max(20, items.length * 4)}s`);

  const viewport = document.createElement('div');
  viewport.className = 'cards-ticker-viewport';
  viewport.append(track);

  block.replaceChildren(viewport);
}
