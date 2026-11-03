# EDS migration input

- Crawl date: 2026-11-03
- Glowworm version: 1.0-SNAPSHOT
- Source URL: https://wknd-adventures.com
- Pages: 21 unique pages (22 fetched; 3 skipped: https://wknd-adventures.com, mailto:hello@wknd-adventures.com, mailto:stories@wknd-adventures.com; 1 duplicate: https://wknd-adventures.com dedupes with https://wknd-adventures.com/index.html)

## Files and how they join

- patterns.jsonl — one line per pattern; each line's id is the pattern's core identity (tag + content-semantic classes). Every parents / children / ancestors reference is a core-identity id that resolves to this file's line ids (an ancestor the crawl does not pattern itself, e.g. the <html> element, is omitted). ancestors is the pattern's most frequent full ancestor chain, outermost to innermost, so it reads like a path.
- components.json — one record per component rule. sourcePattern, ancestors[].id and listContainer are pattern ids (patterns.jsonl line ids); anchorCounts keys are the section pattern ids of the rule's instances' anchors; sample is the pattern's first-occurrence markup and variantSamples carries the first-occurrence markup of each variant (slim variants list the class forms with their counts); chrome is DOM-semantic (see Chrome below). containedIn/edsNested records RULE-TO-RULE nesting only — the rule's ancestors chain (pattern-level, joinable to patterns.jsonl) is the source of truth for containment THROUGH non-component wrappers, so a component inside a non-component container (cards inside a tabs pane) still reads edsNested = false.
- pages.json — one record per page. url is the join key to the crawl's per-URL data; path is the EDS extensionless path; template is the id of the page's template — the SAME value as templates[].id, so every page joins to exactly one template; meta is the crawl's per-page metadata; sections are the page's content-root children in document order. Top level: templates (one entry per page template — id is the document-ordered section signature, representative is the template's highest-coverage page path, sections are the representative page's FULL content-root children — sections AND non-sections, document order) and hashMethod, the checksum method stated once (per-page records carry only hash / mainHash values).
- matrix.csv — rows are pages (extensionless path), columns are the components.json rules. The file is fully column-aligned: header row 1 carries each rule's sourcePattern, header row 2 carries that rule's id directly under its selector (the page and coverage columns are empty in row 2), and every data row has one cell per column. Each column joins to exactly one components.json record by (sourcePattern, id). The trailing coverage column counts the distinct NON-CHROME components present on the page.
- residuals.json — content no rule clustered (one-off or dynamic) plus every RECURRING content pattern the component layer culled as a layout frame (styled wrappers) — each carries its selector and a note; copy it as static content or model it as data-driven. No recurring content pattern is absent from both components.json and residuals.json.

## How selectors and counts are computed

- Selectors use a core identity: each element's identity is its tag plus its content-semantic classes (alphabetized). Utility/layout classes (utility-*, margin-*, padding-*, grid-gap-*, grid-align-*, column-count classes, and data-driven layout variants) are excluded from the identity and recorded as variants, so a component keeps one id across layout variants.
- Counts are instances, not pages: a component's totalCount is its site-wide instance count, perPage/matrix cells are per-page instance counts from the per-URL occurrence grouping, and matrix coverage is the number of distinct non-chrome components present on the page.

## Chrome

- A pattern is site chrome iff EVERY one of its occurrences sits outside the page's <main> element (the content root): the crawl records each occurrence's ancestor chain, and an occurrence on a page without <main> counts as content (the content root falls back to <body>). The <main> element itself and its ancestors are content, not chrome.

## Checksums

The checksum method is recorded once, in pages.json's top-level hashMethod; per-page records carry only the hash values. The exact routines (in crawl code, PageExtractorUtils):

- mainHash — SHA-256, lowercase hex: MessageDigest.getInstance("SHA-256") over main.text().getBytes(UTF-8), where main is the document's FIRST <main> element (document.selectFirst("main")) and main.text() is org.jsoup.nodes.Element#text() — the jsoup LIBRARY text routine: descendant text in document order, tags stripped, entities decoded, whitespace collapsed (this is why a naive join of trimmed text nodes does NOT reproduce it). null when the page has no <main> element.
- bodyHash — CRC32, hex (java.util.zip.CRC32, rendered with Long.toHexString): the document's <body> traversed in document order; the CRC updates with every TextNode's text (each node's text() trimmed, empty nodes skipped) and with every img/iframe element's src attribute value.

hashMethod: bodyHash: CRC32 (hex) over the page <body>: every text node (trimmed, non-blank) and every img/iframe src attribute value, in document order. mainHash: SHA-256 (hex) over the normalized text of the <main> element: document order, tags stripped, whitespace collapsed; null when the page has no <main> element.

## Known gaps

Fixed by this export (peer-review findings): patterns.jsonl references are now core-identity ids that resolve to line ids (they kept utility classes and dangled before) and every line carries the full ancestor chain (ancestors); components.json's sample is no longer null — it carries the pattern's first-occurrence markup, and each rule also carries its ancestors, listContainer, anchorCounts and per-variant samples (variantSamples); chrome is DOM-semantic (all occurrences outside <main>) instead of a selector/urlCount heuristic; pages.json states the checksum method once (top-level hashMethod) instead of per record, carries the EDS extensionless paths, the crawl's per-page meta and the page-template list; matrix.csv is fully column-aligned (header row 1 the rules' sourcePattern selectors, row 2 the rule id directly under each selector) and its coverage excludes chrome; pages[].template is the templates[].id value (the document-ordered section signature), so pages join to templates verbatim; templates[].sections is the representative page's FULL content-root child list (sections AND non-sections, document order); listContainer only ever lists a repeating container element (div/ul) — never a section band or structural root; and every RECURRING content pattern is now represented: recurring content the component layer culled as a layout frame (styling wrapper) is reported in residuals.json with its selector and a note, so no recurring content pattern is absent from both components.json and residuals.json.

## Known limitations

- Selectors are exact matches on the core identity; renamed classes or re-wrapped elements will not resolve — treat unmatched selectors as manual work.
- residuals.json is content no rule clustered (one-off or dynamic) plus recurring content the component layer culled as a layout frame; copy it as static content or model it as data-driven.
- EDS blocks cannot nest: containedIn (edsNested) records RULE-TO-RULE nesting only — it still reads 'not nested' when a component sits inside a NON-component wrapper (cards inside a tabs pane). The source of truth for containment, including through non-component wrappers, is the rule's ancestors chain in components.json (pattern-level, joinable to patterns.jsonl): when flattening, read the enclosing container from that chain.
