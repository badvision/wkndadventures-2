/* eslint-disable */
/* global WebImporter */

import heroFullParser from './parsers/hero-full.js';
import columnsFeaturedParser from './parsers/columns-featured.js';
import tabsCardsParser from './parsers/tabs-cards.js';
import tabsPanelParser from './parsers/tabs-panel.js';
import cardsTickerParser from './parsers/cards-ticker.js';
import accordionFaqParser from './parsers/accordion-faq.js';
import columnsNumberedParser from './parsers/columns-numbered.js';
import cardsGalleryParser from './parsers/cards-gallery.js';
import cardsArticleParser from './parsers/cards-article.js';
import cardsTextParser from './parsers/cards-text.js';
import wkndArticleMetadataTransformer from './transformers/wknd-article-metadata.js';
import wkndCleanupTransformer from './transformers/wknd-cleanup.js';
import wkndSectionsTransformer from './transformers/wknd-sections.js';

const PAGE_TEMPLATE = {
  "name": "content-page",
  "description": "Top-level content page: full-bleed hero with h1/lead/tag/buttons, mix of accent, secondary, inverse and plain sections with article cards, section headings, editorial index, tab menus, FAQ items, image grids.",
  "urls": [
    "https://wknd-adventures.com/",
    "https://wknd-adventures.com/about",
    "https://wknd-adventures.com/adventures",
    "https://wknd-adventures.com/community",
    "https://wknd-adventures.com/destinations",
    "https://wknd-adventures.com/expeditions",
    "https://wknd-adventures.com/faq",
    "https://wknd-adventures.com/gear",
    "https://wknd-adventures.com/sustainability"
  ],
  "representativeUrl": "https://wknd-adventures.com/",
  "urlPattern": "/*",
  "blocks": [
    {
      "name": "hero-full",
      "instances": [
        "section.hero-section--full"
      ]
    },
    {
      "name": "columns-featured",
      "instances": [
        "div.featured-article",
        "div.grid-layout.tablet-1-column"
      ]
    },
    {
      "name": "tabs-cards",
      "instances": [
        "div.tab-container"
      ]
    },
    {
      "name": "tabs-panel",
      "instances": [
        "#main-content > section > div.tab-menu",
        "#main-content > section > div.container > div.tab-menu"
      ]
    },
    {
      "name": "cards-ticker",
      "instances": [
        "div.ticker-strip"
      ]
    },
    {
      "name": "accordion-faq",
      "instances": [
        "div.faq-list"
      ]
    },
    {
      "name": "columns-numbered",
      "instances": [
        "div.editorial-index"
      ]
    },
    {
      "name": "cards-gallery",
      "instances": [
        "div.grid-layout.grid-images"
      ]
    },
    {
      "name": "cards-article",
      "instances": [
        "div.grid-layout:has(> a.article-card):not(.tab-pane *)"
      ]
    },
    {
      "name": "cards-text",
      "instances": [
        "div.grid-layout:has(> div.card.card-body)"
      ]
    }
  ],
  "sections": [
    {
      "id": "hero",
      "name": "Hero (full-bleed)",
      "selector": [
        "#main-content > section.hero-section--full"
      ],
      "style": null,
      "blocks": [
        "hero-full"
      ],
      "defaultContent": []
    },
    {
      "id": "ticker",
      "name": "Activity ticker strip",
      "selector": [
        "#main-content > div.ticker-strip"
      ],
      "style": null,
      "blocks": [
        "cards-ticker"
      ],
      "defaultContent": []
    },
    {
      "id": "secondary",
      "name": "Secondary (warm beige) sections",
      "selector": [
        "#main-content > section.secondary-section"
      ],
      "style": "secondary",
      "blocks": [
        "columns-featured",
        "columns-numbered",
        "cards-article",
        "cards-text",
        "accordion-faq"
      ],
      "defaultContent": [
        "div.section-heading",
        "h2",
        "p",
        "figure",
        "div.button-group"
      ]
    },
    {
      "id": "inverse",
      "name": "Inverse (dark green) sections",
      "selector": [
        "#main-content > section.inverse-section"
      ],
      "style": "inverse",
      "blocks": [
        "cards-gallery",
        "cards-text",
        "cards-article"
      ],
      "defaultContent": [
        "div.section-heading",
        "p.tag",
        "h2",
        "p",
        "img.gallery-img--wide",
        "div.button-group"
      ]
    },
    {
      "id": "accent",
      "name": "Accent (orange) sections",
      "selector": [
        "#main-content > section.accent-section"
      ],
      "style": "accent",
      "blocks": [],
      "defaultContent": [
        "h2",
        "p",
        "ul.blog-gear-list",
        "div.button-group"
      ]
    },
    {
      "id": "plain",
      "name": "Plain sections",
      "selector": [
        "#main-content > section.section:not(.secondary-section):not(.inverse-section):not(.accent-section)"
      ],
      "style": null,
      "blocks": [
        "tabs-cards",
        "tabs-panel",
        "accordion-faq",
        "cards-article",
        "columns-featured",
        "columns-numbered"
      ],
      "defaultContent": [
        "div.section-heading",
        "h2",
        "h3",
        "p",
        "ul.blog-gear-list"
      ]
    }
  ],
  "sectionRules": "Sections vary in order per page: apply EVERY entry to ALL matching elements (querySelectorAll), in document order. Style modifiers: append \"centered\" when the section contains .utility-text-align-center or .button-group--centered; append \"narrow\" when it contains .container--narrow (e.g. \"accent, centered\")."
};

const parsers = {
  'hero-full': heroFullParser,
  'columns-featured': columnsFeaturedParser,
  'tabs-cards': tabsCardsParser,
  'tabs-panel': tabsPanelParser,
  'cards-ticker': cardsTickerParser,
  'accordion-faq': accordionFaqParser,
  'columns-numbered': columnsNumberedParser,
  'cards-gallery': cardsGalleryParser,
  'cards-article': cardsArticleParser,
  'cards-text': cardsTextParser,
};

const transformers = [wkndArticleMetadataTransformer, wkndCleanupTransformer, wkndSectionsTransformer];

function executeTransformers(hookName, element, payload, pageMetadata) {
  // Transformers may add page metadata fields (e.g. Author) via payload.metadata.
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE, metadata: pageMetadata };
  transformers.forEach((fn) => {
    try { fn(hookName, element, enhancedPayload); }
    catch (e) { console.error(`Transformer failed at ${hookName}:`, e); }
  });
}

function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        pageBlocks.push({ name: blockDef.name, selector, element });
      });
    });
  });
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.body;

    const pageMetadata = {};
    executeTransformers('beforeTransform', main, payload, pageMetadata);

    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (!parser) return;
      try { parser(block.element, { document, url, params }); }
      catch (e) { console.error(`Failed to parse ${block.name} (${block.selector}):`, e); }
    });

    executeTransformers('afterTransform', main, payload, pageMetadata);

    main.appendChild(document.createElement('hr'));
    const meta = { ...WebImporter.Blocks.getMetadata(document), ...pageMetadata };
    if (Object.keys(meta).length) main.append(WebImporter.Blocks.getMetadataBlock(document, meta));
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: { title: document.title, template: PAGE_TEMPLATE.name, blocks: pageBlocks.map((b) => b.name) },
    }];
  },
};
