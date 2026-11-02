// media query match that indicates desktop width (mobile-first: everything below is mobile)
// source header switches to desktop above 1024px
const isDesktop = window.matchMedia('(width >= 1025px)');

// delay before a hover-opened megamenu closes after the pointer leaves it (matches source)
const HOVER_CLOSE_DELAY = 200;

/**
 * Fetches the nav fragment. Metadata-independent dual fetch:
 * /content first (local aem up), then the site root (DA/EDS production).
 * @returns {Promise<HTMLElement|null>} container holding the fragment sections
 */
async function fetchNavFragment() {
  let resp = await fetch('/content/nav.plain.html');
  if (!resp.ok) resp = await fetch('/nav.plain.html');
  if (!resp.ok) return null;

  const fragment = document.createElement('div');
  fragment.innerHTML = await resp.text();

  // resolve relative media against the fragment URL so it works on any page depth
  const base = resp.url || new URL('/nav.plain.html', window.location).href;
  fragment.querySelectorAll('img[src]').forEach((img) => {
    img.src = new URL(img.getAttribute('src'), base).href;
  });
  fragment.querySelectorAll('source[srcset]').forEach((source) => {
    source.srcset = new URL(source.getAttribute('srcset'), base).href;
  });
  return fragment;
}

/**
 * Turns authored <strong>/<em> wrapped links into buttons (same convention as main content).
 * @param {Element} container element containing the authored links
 */
function decorateNavButtons(container) {
  container.querySelectorAll('p a[href]').forEach((a) => {
    const p = a.closest('p');
    if (p.textContent.trim() !== a.textContent.trim()) return;
    const strong = a.closest('strong');
    const em = a.closest('em');
    if (!strong && !em) return;
    a.classList.add('button');
    if (strong && em) a.classList.add('accent');
    else if (strong) a.classList.add('primary');
    else a.classList.add('secondary');
    let outer = strong || em;
    if (strong && em) outer = strong.contains(em) ? strong : em;
    outer.replaceWith(a);
  });
}

/**
 * Classifies fragment sections by their content rather than their order.
 * @param {Element} fragment the fetched nav fragment
 * @returns {{brand: Element, sections: Element, tools: Element[], skip: Element}}
 */
function classifySections(fragment) {
  const result = {
    brand: null, sections: null, tools: [], skip: null,
  };
  [...fragment.children].forEach((section) => {
    const links = [...section.querySelectorAll('a[href]')];
    if (!result.sections && section.querySelector('li > ul')) {
      result.sections = section;
    } else if (!result.skip && links.length === 1 && links[0].getAttribute('href').startsWith('#')) {
      result.skip = section;
    } else if (!result.brand && section.querySelector('a img, a picture')) {
      result.brand = section;
    } else {
      result.tools.push(section);
    }
  });
  return result;
}

/**
 * Builds the logo lockup (icon + wordmark) from the authored brand link.
 * @param {Element} brand brand section
 * @returns {HTMLAnchorElement|null}
 */
function buildLogo(brand) {
  const source = brand?.querySelector('a[href]');
  if (!source) return null;
  const logo = document.createElement('a');
  logo.className = 'logo';
  logo.href = source.getAttribute('href');

  const media = source.querySelector('picture') || source.querySelector('img');
  if (media) {
    const icon = document.createElement('span');
    icon.className = 'nav-logo-icon';
    icon.append(media);
    logo.append(icon);
  }
  const text = document.createElement('span');
  text.className = 'logo-text';
  text.append(...source.childNodes);
  logo.append(text);
  // line breaks in the wordmark count as spaces for the accessible name
  const name = [...text.childNodes]
    .map((node) => (node.nodeName === 'BR' ? ' ' : node.textContent))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  if (name) logo.setAttribute('aria-label', name);
  return logo;
}

/**
 * Builds one megamenu card link (title + description) from an authored list item.
 * @param {HTMLLIElement} li authored item: link paragraph + optional description paragraph
 * @param {string} variant 'link' or 'article'
 * @returns {HTMLAnchorElement|null}
 */
function buildPanelCard(li, variant) {
  const link = li.querySelector('a[href]');
  if (!link) return null;
  const card = document.createElement('a');
  card.className = `nav-megamenu-${variant}`;
  card.href = link.getAttribute('href');

  const title = document.createElement('span');
  title.className = `nav-megamenu-${variant}-title`;
  title.textContent = link.textContent.trim();
  card.append(title);

  const descText = [...li.childNodes]
    .filter((node) => !node.contains?.(link) && node !== link)
    .map((node) => node.textContent.trim())
    .filter(Boolean)
    .join(' ');
  if (descText) {
    const desc = document.createElement('span');
    desc.className = `nav-megamenu-${variant}-desc`;
    desc.textContent = descText;
    card.append(desc);
  }
  const img = li.querySelector('picture, img');
  if (img) card.prepend(img);
  return card;
}

/**
 * Splits the authored content of a top-level item into groups: each group is an
 * optional label paragraph followed by a list of links.
 * @param {Element[]} nodes child elements after the trigger label
 * @returns {{label: string|null, items: HTMLLIElement[]}[]}
 */
function groupPanelContent(nodes) {
  const groups = [];
  let pendingLabel = null;
  nodes.forEach((node) => {
    if (node.tagName === 'UL' || node.tagName === 'OL') {
      groups.push({ label: pendingLabel, items: [...node.children] });
      pendingLabel = null;
    } else if (node.textContent.trim()) {
      pendingLabel = node.textContent.trim();
    }
  });
  return groups;
}

/**
 * Builds the panel for one top-level nav item.
 * One group -> equal-column grid. Several groups -> a primary column plus
 * labelled secondary columns rendered as a two-column card grid.
 * @param {{label: string|null, items: HTMLLIElement[]}[]} groups
 * @returns {HTMLDivElement}
 */
function buildPanel(groups) {
  const panel = document.createElement('div');
  panel.className = 'nav-megamenu';
  const container = document.createElement('div');
  container.className = 'nav-megamenu-container';
  panel.append(container);

  const buildGrid = (items, variant) => {
    const grid = document.createElement('div');
    grid.className = 'nav-megamenu-grid';
    items.map((li) => buildPanelCard(li, variant)).filter(Boolean).forEach((c) => grid.append(c));
    grid.style.setProperty('--nav-megamenu-cols', Math.min(Math.max(grid.children.length, 1), 4));
    return grid;
  };

  if (groups.length === 1) {
    container.append(buildGrid(groups[0].items, 'link'));
    return panel;
  }

  const split = document.createElement('div');
  split.className = 'nav-megamenu-split';
  groups.forEach((group, i) => {
    const column = document.createElement('div');
    column.className = i === 0 ? 'nav-megamenu-primary' : 'nav-megamenu-secondary';
    if (group.label) {
      const label = document.createElement('p');
      label.className = 'nav-megamenu-section-label';
      label.textContent = group.label;
      column.append(label);
    }
    const grid = buildGrid(group.items, i === 0 ? 'link' : 'article');
    if (i > 0) grid.style.setProperty('--nav-megamenu-cols', 2);
    column.append(grid);
    split.append(column);
  });
  container.append(split);
  return panel;
}

/**
 * Builds the main menu list with triggers and panels.
 * @param {Element} sections authored sections container
 * @returns {HTMLUListElement}
 */
function buildMenuList(sections) {
  const list = document.createElement('ul');
  list.className = 'nav-menu-list';
  const topList = sections?.querySelector('ul');
  if (!topList) return list;

  [...topList.children].forEach((authored, idx) => {
    const item = document.createElement('li');
    item.className = 'nav-menu-list-item';
    const children = [...authored.children];
    const hasPanel = children.some((c) => c.tagName === 'UL' || c.tagName === 'OL');

    if (!hasPanel) {
      const link = authored.querySelector('a[href]');
      if (link) {
        link.className = 'nav-link';
        item.append(link);
      }
      list.append(item);
      return;
    }

    const [labelNode, ...rest] = children;
    item.classList.add('nav-megamenu-item');
    const panelId = `nav-megamenu-${idx}`;

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'nav-link nav-megamenu-trigger';
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', panelId);
    const label = document.createElement('span');
    label.textContent = labelNode.textContent.trim();
    const caret = document.createElement('span');
    caret.className = 'nav-caret';
    caret.setAttribute('aria-hidden', 'true');
    trigger.append(label, caret);

    const panel = buildPanel(groupPanelContent(rest));
    panel.id = panelId;
    item.append(trigger, panel);
    list.append(item);
  });
  return list;
}

/**
 * Builds the hamburger toggle (two inline icons, swapped via aria-expanded).
 * @returns {HTMLButtonElement}
 */
function buildHamburger() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'nav-mobile-menu-button';
  button.setAttribute('aria-controls', 'nav-menu');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-label', 'Open navigation');
  button.innerHTML = `
    <svg class="nav-icon-hamburger" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="6" width="18" height="2" fill="currentColor"/>
      <rect x="3" y="11" width="18" height="2" fill="currentColor"/>
      <rect x="3" y="16" width="18" height="2" fill="currentColor"/>
    </svg>
    <svg class="nav-icon-close" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 5L19 19M19 5L5 19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
  return button;
}

/**
 * Opens or closes one megamenu item.
 * @param {Element} item li.nav-megamenu-item
 * @param {boolean} open desired state
 */
function setItemOpen(item, open) {
  item.classList.toggle('is-open', open);
  if (!open) delete item.dataset.pinned;
  item.querySelector('.nav-megamenu-trigger')?.setAttribute('aria-expanded', String(open));
}

/**
 * Closes every megamenu item in the nav, optionally except one.
 * @param {Element} nav nav root
 * @param {Element} [except] item to leave untouched
 */
function closeAllItems(nav, except) {
  nav.querySelectorAll('.nav-megamenu-item').forEach((item) => {
    if (item !== except) setItemOpen(item, false);
  });
}

/**
 * Opens/closes the mobile menu.
 * @param {Element} nav nav root
 * @param {boolean} [force] desired state; toggles when omitted
 */
function toggleMobileMenu(nav, force) {
  const menu = nav.querySelector('.nav-menu');
  const button = nav.querySelector('.nav-mobile-menu-button');
  const open = force ?? button.getAttribute('aria-expanded') !== 'true';
  menu.classList.toggle('is-open', open);
  nav.dataset.menuOpen = String(open);
  button.setAttribute('aria-expanded', String(open));
  button.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  // like the source, expanded headings stay expanded when the menu is closed and reopened
}

/**
 * Wires hover / click / keyboard / resize behaviour.
 * @param {Element} nav nav root
 */
function bindBehaviour(nav) {
  const timers = new WeakMap();

  nav.querySelectorAll('.nav-megamenu-item').forEach((item) => {
    const trigger = item.querySelector('.nav-megamenu-trigger');

    item.addEventListener('mouseenter', () => {
      if (!isDesktop.matches) return;
      clearTimeout(timers.get(item));
      closeAllItems(nav, item);
      setItemOpen(item, true);
    });
    item.addEventListener('mouseleave', () => {
      if (!isDesktop.matches || item.dataset.pinned) return;
      timers.set(item, setTimeout(() => setItemOpen(item, false), HOVER_CLOSE_DELAY));
    });

    trigger.addEventListener('click', () => {
      clearTimeout(timers.get(item));
      if (isDesktop.matches) {
        // desktop: click pins the panel open (hover already shows it); a second click closes
        if (item.dataset.pinned) {
          setItemOpen(item, false);
        } else {
          closeAllItems(nav, item);
          setItemOpen(item, true);
          item.dataset.pinned = 'true';
        }
      } else {
        // mobile: accordion toggle, items expand independently
        setItemOpen(item, !item.classList.contains('is-open'));
      }
    });

    // keyboard parity with the source's :focus-within behaviour on desktop
    item.addEventListener('focusin', () => {
      if (!isDesktop.matches || item.classList.contains('is-open')) return;
      closeAllItems(nav, item);
      setItemOpen(item, true);
    });
    item.addEventListener('focusout', (e) => {
      if (!isDesktop.matches || item.contains(e.relatedTarget)) return;
      if (!item.matches(':hover')) setItemOpen(item, false);
    });
  });

  nav.querySelector('.nav-mobile-menu-button')
    .addEventListener('click', () => toggleMobileMenu(nav));

  document.addEventListener('click', (e) => {
    if (isDesktop.matches && !nav.contains(e.target)) closeAllItems(nav);
  });

  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Escape') return;
    const open = nav.querySelector('.nav-megamenu-item.is-open');
    if (isDesktop.matches && open) {
      closeAllItems(nav);
      open.querySelector('.nav-megamenu-trigger').focus();
    } else if (!isDesktop.matches && nav.querySelector('.nav-menu.is-open')) {
      toggleMobileMenu(nav, false);
      nav.querySelector('.nav-mobile-menu-button').focus();
    }
  });

  // crossing the breakpoint: reset mobile drawer, hamburger and any open panel
  isDesktop.addEventListener('change', () => {
    toggleMobileMenu(nav, false);
    closeAllItems(nav);
  });
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const fragment = await fetchNavFragment();
  if (!fragment) return;
  decorateNavButtons(fragment);
  const {
    brand, sections, tools, skip,
  } = classifySections(fragment);

  // bar root (mirrors source: logo | <nav> menu | right group)
  const nav = document.createElement('div');
  nav.id = 'nav';
  nav.className = 'nav-bar';
  nav.dataset.menuOpen = 'false';

  const inner = document.createElement('div');
  inner.className = 'nav-inner';

  const logo = buildLogo(brand);
  if (logo) inner.append(logo);

  const menu = document.createElement('nav');
  menu.className = 'nav-menu';
  menu.id = 'nav-menu';
  menu.setAttribute('aria-label', 'Main navigation');
  menu.append(buildMenuList(sections));
  inner.append(menu);

  const right = document.createElement('div');
  right.className = 'nav-right';
  tools.forEach((section) => {
    section.querySelectorAll('a[href]').forEach((a) => right.append(a));
  });
  right.append(buildHamburger());
  inner.append(right);
  nav.append(inner);

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);

  block.textContent = '';
  const skipSource = skip?.querySelector('a[href^="#"]');
  if (skipSource) {
    skipSource.className = 'skip-link';
    const targetId = skipSource.getAttribute('href').slice(1);
    const main = document.querySelector('main');
    if (targetId && main && !document.getElementById(targetId)) {
      main.id = targetId;
      main.setAttribute('tabindex', '-1');
    }
    block.append(skipSource);
  }
  block.append(navWrapper);

  bindBehaviour(nav);
}
