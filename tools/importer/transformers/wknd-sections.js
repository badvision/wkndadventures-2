/* eslint-disable */
/* global WebImporter */

/**
 * WKND Adventures sections transformer.
 *
 * Section order varies per page in this template, so each entry in
 * payload.template.sections is a CLASS RULE (see template.sectionRules):
 * every element matching any of its selectors is a section. All matches are
 * collected, de-duplicated, sorted into document order, then:
 *  - beforeTransform: reverse walk, insert <hr> before every non-first
 *    section; styled sections get a temporary data-excat-section-id marker
 *    on their <hr> (a styled first section gets a temp marked <hr> too).
 *  - afterTransform: reverse walk, insert Section Metadata after each
 *    marker's section content (before the next <hr>), remove markers, and
 *    remove the first section's temporary <hr>.
 *
 * Style = rule.style plus modifiers:
 *  - "centered" if the section contains .utility-text-align-center or
 *    .button-group--centered
 *  - "narrow" if it contains .container--narrow
 */

const MARKER = 'data-excat-section-id';
const FIRST_MARKER = 'data-excat-section-first';

function computeStyle(el, baseStyle) {
  const parts = [];
  if (baseStyle) parts.push(baseStyle);
  if (el.matches('.utility-text-align-center, .button-group--centered')
    || el.querySelector('.utility-text-align-center, .button-group--centered')) {
    parts.push('centered');
  }
  if (el.matches('.container--narrow') || el.querySelector('.container--narrow')) {
    parts.push('narrow');
  }
  return parts.length ? parts.join(', ') : null;
}

function collectSections(root, rules) {
  const seen = new Set();
  const found = [];
  (rules || []).forEach((rule, ruleIndex) => {
    const selectors = Array.isArray(rule.selector) ? rule.selector : [rule.selector];
    selectors.filter(Boolean).forEach((sel) => {
      let matches = [];
      try {
        matches = [...root.querySelectorAll(sel)];
      } catch (e) {
        matches = [];
      }
      matches.forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        found.push({ el, rule, ruleIndex });
      });
    });
  });
  // Keep only top-level matches (drop any match nested in another match).
  const top = found.filter(({ el }) => !found.some((o) => o.el !== el && o.el.contains(el)));
  // Document order.
  top.sort((a, b) => {
    if (a.el === b.el) return 0;
    // 4 = DOCUMENT_POSITION_FOLLOWING
    return (a.el.compareDocumentPosition(b.el) & 4) ? -1 : 1;
  });
  return top;
}

/**
 * A source section holding several .container children (e.g. /adventures
 * "How We Plan" + "Going further?") separates them with 64px margin + 64px
 * padding. Two adjacent EDS sections with the same style give the same gap,
 * so split each extra container into its own copy of the section element.
 */
function splitMultiContainerSections(root) {
  root.querySelectorAll('section.section').forEach((section) => {
    const containers = [...section.querySelectorAll(':scope > .container')];
    if (containers.length < 2) return;
    let anchor = section;
    containers.slice(1).forEach((container) => {
      const copy = section.cloneNode(false);
      copy.append(container);
      anchor.after(copy);
      anchor = copy;
    });
  });
}

export default function transform(hookName, element, payload) {
  const document = element.ownerDocument || payload.document;
  const rules = payload && payload.template && payload.template.sections;
  if (!rules || rules.length < 2) return;

  if (hookName === 'beforeTransform') {
    splitMultiContainerSections(element);
    const sections = collectSections(element, rules);
    if (!sections.length) return;

    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const { el, rule } = sections[i];
      const style = computeStyle(el, rule.style);
      if (i === 0 && !style) continue;
      const hr = document.createElement('hr');
      if (style) hr.setAttribute(MARKER, `${rule.id || 'section'}-${i}`);
      if (i === 0) hr.setAttribute(FIRST_MARKER, 'true');
      hr.setAttribute('data-excat-section-style', style || '');
      el.parentNode.insertBefore(hr, el);
    }
  }

  if (hookName === 'afterTransform') {
    const hrs = [...element.querySelectorAll('hr[data-excat-section-style]')];
    for (let i = hrs.length - 1; i >= 0; i -= 1) {
      const hr = hrs[i];
      const style = hr.getAttribute('data-excat-section-style');
      const isFirst = hr.hasAttribute(FIRST_MARKER);

      if (hr.hasAttribute(MARKER) && style) {
        // Section content runs from this <hr> to the next <hr> sibling
        // (or end of parent). Insert metadata at the end of that range.
        let end = hr.nextElementSibling;
        while (end && end.tagName !== 'HR') end = end.nextElementSibling;
        const meta = WebImporter.Blocks.createBlock(document, {
          name: 'Section Metadata',
          cells: { style },
        });
        if (end) hr.parentNode.insertBefore(meta, end);
        else hr.parentNode.appendChild(meta);
      }

      hr.removeAttribute(MARKER);
      hr.removeAttribute('data-excat-section-style');
      if (isFirst) hr.remove();
    }
  }
}
