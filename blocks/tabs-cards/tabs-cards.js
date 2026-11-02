import { createOptimizedPicture, toClassName } from '../../scripts/aem.js';

let blockCount = 0;

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

/**
 * Split a tab's content cell into card groups. A new card starts at every image;
 * when the cell has no images, a new card starts at every heading instead.
 */
function groupCards(cell) {
  const els = [...cell.children];
  const hasImages = els.some(isImageEl);
  const isStart = hasImages ? isImageEl : (el) => /^H[1-6]$/.test(el.tagName);
  if (!els.some(isStart)) return null;

  const groups = [];
  let current = null;
  els.forEach((el) => {
    if (isStart(el) || !current) {
      current = { image: null, body: [] };
      groups.push(current);
      if (hasImages && isImageEl(el)) {
        current.image = el;
        return;
      }
    }
    current.body.push(el);
  });
  return groups;
}

function buildCard({ image, body }) {
  const card = document.createElement('li');
  card.className = 'tabs-cards-card';

  if (image) {
    const media = document.createElement('div');
    media.className = 'tabs-cards-card-image';
    media.append(image.tagName === 'PICTURE' ? image : image.querySelector('picture'));
    card.append(media);
  }

  if (body.length) {
    const content = document.createElement('div');
    content.className = 'tabs-cards-card-body';
    content.append(...body);
    const heading = content.querySelector('h1, h2, h3, h4, h5, h6');
    const prev = heading?.previousElementSibling;
    if (prev && prev.tagName === 'P' && !prev.querySelector('a, picture')) {
      prev.classList.add('tabs-cards-card-tag');
    }
    // the heading link (or the first link) makes the whole card clickable
    const link = heading?.querySelector('a') || content.querySelector('a');
    if (link) {
      link.classList.add('tabs-cards-card-link');
      card.classList.add('tabs-cards-card-linked');
    }
    card.append(content);
  }
  return card;
}

function activate(block, tablist, button, panel, focus = false) {
  block.querySelectorAll(':scope > .tabs-cards-panel').forEach((p) => {
    p.setAttribute('aria-hidden', p !== panel);
  });
  tablist.querySelectorAll('[role=tab]').forEach((btn) => {
    const selected = btn === button;
    btn.setAttribute('aria-selected', selected);
    btn.tabIndex = selected ? 0 : -1;
  });
  if (focus) button.focus();
}

/**
 * tabs-cards: tab switcher whose panels render a grid of article cards.
 * Each row: [tab label] [content: repeating image + tag paragraph + linked heading + paragraph].
 * Rows without a content cell get an empty panel; rows without a label are labelled by position.
 */
export default function decorate(block) {
  blockCount += 1;
  const prefix = `tabs-cards-${blockCount}`;

  const tablist = document.createElement('div');
  tablist.className = 'tabs-cards-list';
  tablist.setAttribute('role', 'tablist');

  const rows = [...block.children];
  const usedIds = new Set();
  const entries = [];

  rows.forEach((row, i) => {
    const [labelCell, ...contentCells] = [...row.children];
    if (!labelCell) {
      row.remove();
      return;
    }
    const labelText = labelCell.textContent.trim() || `Tab ${i + 1}`;
    let id = toClassName(labelText) || `tab-${i + 1}`;
    while (usedIds.has(id)) id = `${id}-${i + 1}`;
    usedIds.add(id);

    const panel = document.createElement('div');
    panel.className = 'tabs-cards-panel';
    panel.id = `${prefix}-panel-${id}`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', `${prefix}-tab-${id}`);
    panel.tabIndex = 0;

    contentCells.forEach((cell) => {
      const groups = groupCards(cell);
      if (groups) {
        const grid = document.createElement('ul');
        grid.className = 'tabs-cards-grid';
        groups.forEach((g) => grid.append(buildCard(g)));
        panel.append(grid);
      } else if (cell.textContent.trim() || cell.children.length) {
        const plain = document.createElement('div');
        plain.className = 'tabs-cards-panel-content';
        plain.append(...cell.childNodes);
        panel.append(plain);
      }
    });

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tabs-cards-tab';
    button.id = `${prefix}-tab-${id}`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', panel.id);
    button.textContent = labelText;

    tablist.append(button);
    row.replaceWith(panel);
    entries.push({ button, panel });
  });

  if (!entries.length) return;

  entries.forEach(({ button, panel }, i) => {
    button.addEventListener('click', () => activate(block, tablist, button, panel));
    button.addEventListener('keydown', (e) => {
      let next = null;
      if (e.key === 'ArrowRight') next = entries[(i + 1) % entries.length];
      else if (e.key === 'ArrowLeft') next = entries[(i - 1 + entries.length) % entries.length];
      else if (e.key === 'Home') [next] = entries;
      else if (e.key === 'End') next = entries[entries.length - 1];
      if (next) {
        e.preventDefault();
        activate(block, tablist, next.button, next.panel, true);
      }
    });
  });

  block.prepend(tablist);
  activate(block, tablist, entries[0].button, entries[0].panel);
  optimizeImages(block);
}
