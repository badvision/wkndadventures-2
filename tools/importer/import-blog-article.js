/* eslint-disable */
/* global WebImporter */

import heroFullParser from './parsers/hero-full.js';
import quotePullParser from './parsers/quote-pull.js';
import cardsGalleryParser from './parsers/cards-gallery.js';
import cardsArticleParser from './parsers/cards-article.js';
import wkndArticleMetadataTransformer from './transformers/wknd-article-metadata.js';
import wkndCleanupTransformer from './transformers/wknd-cleanup.js';
import wkndSectionsTransformer from './transformers/wknd-sections.js';

const PAGE_TEMPLATE = {
  "name": "blog-article",
  "description": "Blog article: hero-section (image + title), blog-article-section body with pull quote and gear lists, secondary related-articles, inverse image grid, plain closing section.",
  "urls": [
    "https://wknd-adventures.com/blog/alpine-cycling",
    "https://wknd-adventures.com/blog/desert-survival-guide",
    "https://wknd-adventures.com/blog/kayaking-norway",
    "https://wknd-adventures.com/blog/mountain-photography",
    "https://wknd-adventures.com/blog/patagonia-trek",
    "https://wknd-adventures.com/blog/surfing-costa-rica",
    "https://wknd-adventures.com/blog/ultralight-backpacking",
    "https://wknd-adventures.com/blog/wild-swimming-guide",
    "https://wknd-adventures.com/blog/winter-mountaineering",
    "https://wknd-adventures.com/blog/yosemite-rock-climbing"
  ],
  "representativeUrl": "https://wknd-adventures.com/blog/patagonia-trek",
  "urlPattern": "/blog/*",
  "blocks": [
    {
      "name": "hero-full",
      "instances": [
        "#main-content > section.hero-section"
      ]
    },
    {
      "name": "quote-pull",
      "instances": [
        "blockquote.pull-quote",
        "div.blog-content-body blockquote"
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
    }
  ],
  "sections": [
    {
      "id": "hero",
      "name": "Article hero",
      "selector": [
        "#main-content > section.hero-section"
      ],
      "style": null,
      "blocks": [
        "hero-full"
      ],
      "defaultContent": []
    },
    {
      "id": "article",
      "name": "Article body",
      "selector": [
        "#main-content > section.blog-article-section"
      ],
      "style": "narrow",
      "blocks": [
        "quote-pull"
      ],
      "defaultContent": [
        "h2",
        "p",
        "figure"
      ]
    },
    {
      "id": "secondary",
      "name": "What we carried + pull quote",
      "selector": [
        "#main-content > section.secondary-section"
      ],
      "style": "secondary, split",
      "blocks": [
        "quote-pull"
      ],
      "defaultContent": [
        "h3",
        "ul.blog-gear-list"
      ]
    },
    {
      "id": "inverse",
      "name": "Gallery",
      "selector": [
        "#main-content > section.inverse-section"
      ],
      "style": "inverse",
      "blocks": [
        "cards-gallery"
      ],
      "defaultContent": [
        "div.section-heading",
        "img.gallery-img--wide"
      ]
    },
    {
      "id": "plain",
      "name": "Related articles",
      "selector": [
        "#main-content > section.section:not(.secondary-section):not(.inverse-section):not(.accent-section):not(.blog-article-section)"
      ],
      "style": null,
      "blocks": [
        "cards-article"
      ],
      "defaultContent": [
        "div.section-heading"
      ]
    }
  ],
  "sectionRules": "Sections vary in order per page: apply EVERY entry to ALL matching elements (querySelectorAll), in document order. Style modifiers: append \"centered\" when the section contains .utility-text-align-center or .button-group--centered; append \"narrow\" when it contains .container--narrow (e.g. \"accent, centered\").",
  "pageMetadata": "From div.article-byline: Author (p.article-byline-name), Publication Date + Reading Time (p.article-byline-meta split on ·), Tags (span.tag split on ·)."
};

const parsers = {
  'hero-full': heroFullParser,
  'quote-pull': quotePullParser,
  'cards-gallery': cardsGalleryParser,
  'cards-article': cardsArticleParser,
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
