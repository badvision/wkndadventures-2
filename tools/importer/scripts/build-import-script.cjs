// Generates tools/importer/import-<template>.js from page-templates.json.
// Usage: node tools/importer/scripts/build-import-script.cjs <template-name>
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const name = process.argv[2];
const { templates } = JSON.parse(fs.readFileSync(path.join(root, 'page-templates.json'), 'utf8'));
const tpl = templates.find((t) => t.name === name);
if (!tpl) throw new Error(`template not found: ${name}`);

const camel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const parserNames = [...new Set(tpl.blocks.map((b) => b.name))];
parserNames.forEach((p) => {
  if (!fs.existsSync(path.join(root, 'parsers', `${p}.js`))) throw new Error(`missing parser: ${p}`);
});
const transformerFiles = fs.readdirSync(path.join(root, 'transformers')).filter((f) => f.endsWith('.js')).sort();

const out = `/* eslint-disable */
/* global WebImporter */

${parserNames.map((p) => `import ${camel(p)}Parser from './parsers/${p}.js';`).join('\n')}
${transformerFiles.map((f) => `import ${camel(f.replace(/\.js$/, ''))}Transformer from './transformers/${f}';`).join('\n')}

const PAGE_TEMPLATE = ${JSON.stringify(tpl, null, 2)};

const parsers = {
${parserNames.map((p) => `  '${p}': ${camel(p)}Parser,`).join('\n')}
};

const transformers = [${transformerFiles.map((f) => `${camel(f.replace(/\.js$/, ''))}Transformer`).join(', ')}];

function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((fn) => {
    try { fn(hookName, element, enhancedPayload); }
    catch (e) { console.error(\`Transformer failed at \${hookName}:\`, e); }
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

    executeTransformers('beforeTransform', main, payload);

    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (!parser) return;
      try { parser(block.element, { document, url, params }); }
      catch (e) { console.error(\`Failed to parse \${block.name} (\${block.selector}):\`, e); }
    });

    executeTransformers('afterTransform', main, payload);

    main.appendChild(document.createElement('hr'));
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    const rawPath = new URL(params.originalURL).pathname
      .replace(/\\/$/, '')
      .replace(/\\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: { title: document.title, template: PAGE_TEMPLATE.name, blocks: pageBlocks.map((b) => b.name) },
    }];
  },
};
`;
const target = path.join(root, `import-${name}.js`);
fs.writeFileSync(target, out);
console.log(`wrote ${path.relative(process.cwd(), target)} (${parserNames.length} parsers, ${transformerFiles.length} transformers)`);
