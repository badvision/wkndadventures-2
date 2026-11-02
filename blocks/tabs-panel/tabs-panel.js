import { createOptimizedPicture, toClassName } from '../../scripts/aem.js';

let blockCount = 0;

/** Lines up to this many characters count as short (a name, a role). */
const SHORT_LINE_MAX = 80;

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

/** A short text paragraph or heading with no image (a name or role line). */
function isShortLine(el) {
  if (!/^(P|H[1-6])$/.test(el.tagName) || el.querySelector('picture')) return false;
  const text = el.textContent.trim();
  return !!text && text.length <= SHORT_LINE_MAX;
}

/**
 * When a panel opens with an image followed by short lines, lay them out as a
 * narrow profile column (circular image + lines) beside the remaining content.
 * Returns null when the cell does not have that shape.
 */
function buildProfile(cell) {
  const els = [...cell.children];
  if (els.length < 2 || !isImageEl(els[0]) || !isShortLine(els[1])) return null;

  let i = 1;
  while (i < els.length && isShortLine(els[i])) i += 1;
  const lines = els.slice(1, i);
  const rest = els.slice(i);

  const profile = document.createElement('div');
  profile.className = 'tabs-panel-profile';

  const media = document.createElement('div');
  media.className = 'tabs-panel-profile-media';
  const image = document.createElement('div');
  image.className = 'tabs-panel-profile-image';
  image.append(els[0].tagName === 'PICTURE' ? els[0] : els[0].querySelector('picture'));
  media.append(image);
  lines.forEach((line, n) => {
    line.classList.add(n === 0 ? 'tabs-panel-profile-name' : 'tabs-panel-profile-line');
    media.append(line);
  });
  profile.append(media);

  if (rest.length) {
    const content = document.createElement('div');
    content.className = 'tabs-panel-profile-content';
    content.append(...rest);
    profile.append(content);
  }
  return profile;
}

function activate(block, tablist, button, panel, focus = false) {
  block.querySelectorAll(':scope > .tabs-panel-panel').forEach((p) => {
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
 * tabs-panel: tab switcher whose panels hold free-form content.
 * Each row: [tab label] [free-form panel content]. A panel that opens with an image
 * followed by short lines (name, role) renders as a profile: a narrow column with a
 * circular image and those lines, beside the remaining content. Other panels render
 * as plain content. Rows without a content cell get an empty panel; rows without a
 * label are labelled by position.
 */
export default function decorate(block) {
  blockCount += 1;
  const prefix = `tabs-panel-${blockCount}`;

  const tablist = document.createElement('div');
  tablist.className = 'tabs-panel-list';
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
    panel.className = 'tabs-panel-panel';
    panel.id = `${prefix}-panel-${id}`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', `${prefix}-tab-${id}`);
    panel.tabIndex = 0;

    contentCells.forEach((cell) => {
      if (!cell.textContent.trim() && !cell.children.length) return;
      const profile = buildProfile(cell);
      if (profile) {
        panel.append(profile);
        return;
      }
      const plain = document.createElement('div');
      plain.className = 'tabs-panel-content';
      plain.append(...cell.childNodes);
      panel.append(plain);
    });

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tabs-panel-tab';
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
