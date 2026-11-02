/**
 * Fetches the footer fragment. Metadata-independent dual fetch:
 * /content first (local aem up), then the site root (DA/EDS production).
 * @returns {Promise<HTMLElement|null>} container holding the fragment sections
 */
async function fetchFooterFragment() {
  let resp = await fetch('/content/footer.plain.html');
  if (!resp.ok) resp = await fetch('/footer.plain.html');
  if (!resp.ok) return null;

  const fragment = document.createElement('div');
  fragment.innerHTML = await resp.text();

  // resolve relative media against the fragment URL so it works on any page depth
  const base = resp.url || new URL('/footer.plain.html', window.location).href;
  fragment.querySelectorAll('img[src]').forEach((img) => {
    img.src = new URL(img.getAttribute('src'), base).href;
  });
  fragment.querySelectorAll('source[srcset]').forEach((source) => {
    source.srcset = new URL(source.getAttribute('srcset'), base).href;
  });
  return fragment;
}

/**
 * Classifies a fragment section by its content rather than its position.
 * @param {Element} section top-level fragment section
 * @returns {'links'|'brand'|'bottom'}
 */
function classifySection(section) {
  if (section.querySelector('ul a[href], ol a[href]')) return 'links';
  if (section.querySelector('img, picture')) return 'brand';
  return 'bottom';
}

/**
 * Builds the brand column: logo lockup (image + wordmark) followed by any authored copy.
 * @param {Element} section brand section
 * @returns {HTMLElement}
 */
function buildBrandColumn(section) {
  const column = document.createElement('div');
  column.className = 'footer-column footer-brand';

  const media = section.querySelector('picture') || section.querySelector('img');
  const logoHost = media.closest('p') || media.parentElement;

  const logo = document.createElement('div');
  logo.className = 'footer-logo';
  const icon = document.createElement('span');
  icon.className = 'footer-logo-icon';
  icon.append(media);
  const wordmark = document.createElement('span');
  wordmark.className = 'footer-logo-text';
  if (logoHost && logoHost !== section) {
    while (logoHost.firstChild) wordmark.append(logoHost.firstChild);
    logoHost.remove();
  }
  logo.append(icon);
  if (wordmark.textContent.trim()) logo.append(wordmark);
  column.append(logo);

  [...section.children].forEach((child) => {
    if (child.tagName === 'P') child.classList.add('footer-tagline');
    column.append(child);
  });
  return column;
}

/**
 * Builds a link column: optional heading plus the authored list of links.
 * @param {Element} section link-group section
 * @returns {HTMLElement}
 */
function buildLinkColumn(section) {
  const column = document.createElement('div');
  column.className = 'footer-column footer-links';
  section.querySelector('h1, h2, h3, h4, h5, h6')?.classList.add('footer-heading');
  section.querySelectorAll('ul, ol').forEach((list) => list.classList.add('footer-link-list'));
  section.querySelectorAll('li a[href]').forEach((a) => a.classList.add('footer-link'));
  while (section.firstChild) column.append(section.firstChild);
  return column;
}

/**
 * Builds the bottom bar from text-only sections (copyright, sign-off, legal).
 * @param {Element[]} sections text-only sections
 * @returns {HTMLElement|null}
 */
function buildBottomBar(sections) {
  if (!sections.length) return null;
  const bottom = document.createElement('div');
  bottom.className = 'footer-bottom';
  sections.forEach((section) => {
    [...section.children].forEach((child) => {
      if (child.tagName === 'P') child.classList.add('footer-note');
      bottom.append(child);
    });
  });
  return bottom.children.length ? bottom : null;
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const fragment = await fetchFooterFragment();
  block.textContent = '';
  if (!fragment) return;

  const container = document.createElement('div');
  container.className = 'footer-container';
  const top = document.createElement('div');
  top.className = 'footer-top';
  const bottomSections = [];

  [...fragment.children].forEach((section) => {
    const kind = classifySection(section);
    if (kind === 'links') top.append(buildLinkColumn(section));
    else if (kind === 'brand') top.append(buildBrandColumn(section));
    else bottomSections.push(section);
  });

  if (top.children.length) container.append(top);
  const bottom = buildBottomBar(bottomSections);
  if (bottom) container.append(bottom);
  block.append(container);
}
