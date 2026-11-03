# EDS migration input

- Crawl date: 2026-11-02
- Glowworm version: 1.0-SNAPSHOT
- Source URL: https://wknd-adventures.com
- Pages: 21 unique pages (22 fetched; 3 skipped: https://wknd-adventures.com, mailto:hello@wknd-adventures.com, mailto:stories@wknd-adventures.com; 1 duplicate: https://wknd-adventures.com dedupes with https://wknd-adventures.com/index.html)

## Files and how they join

- patterns.jsonl — one line per pattern; each line's id is the pattern's core identity (tag + content-semantic classes). Every parents / children / ancestors reference is a core-identity id that resolves to this file's line ids (an ancestor the crawl does not pattern itself, e.g. the <html> element, is omitted). ancestors is the pattern's most frequent full ancestor chain, outermost to innermost, so it reads like a path.
- components.json — one record per component rule. sourcePattern, ancestors[].id and listContainer are pattern ids (patterns.jsonl line ids); anchorCounts keys are the section pattern ids of the rule's instances' anchors; sample is the pattern's first-occurrence markup; chrome is DOM-semantic (see Chrome below).
- pages.json — one record per page. url is the join key to the crawl's per-URL data; path is the EDS extensionless path; meta is the crawl's per-page metadata; sections are the page's content-root children in document order. Top level: templates (one entry per page template — signature is the document-ordered section ids, representative is the template's highest-coverage page path, sections in document order) and hashMethod, the checksum method stated once (per-page records carry only hash / mainHash values).
- matrix.csv — rows are pages (extensionless path), columns are the components.json rules: the first header row carries each rule's sourcePattern, the second its id; the trailing coverage column counts the distinct NON-CHROME components present on the page.
- residuals.json — content no rule clustered (one-off or dynamic); copy it as static content or model it as data-driven.

## How selectors and counts are computed

- Selectors use a core identity: each element's identity is its tag plus its content-semantic classes (alphabetized). Utility/layout classes (utility-*, margin-*, padding-*, grid-gap-*, grid-align-*, column-count classes, and data-driven layout variants) are excluded from the identity and recorded as variants, so a component keeps one id across layout variants.
- Counts are instances, not pages: a component's totalCount is its site-wide instance count, perPage/matrix cells are per-page instance counts from the per-URL occurrence grouping, and matrix coverage is the number of distinct non-chrome components present on the page.

## Chrome

- A pattern is site chrome iff EVERY one of its occurrences sits outside the page's <main> element (the content root): the crawl records each occurrence's ancestor chain, and an occurrence on a page without <main> counts as content (the content root falls back to <body>). The <main> element itself and its ancestors are content, not chrome.

## Checksums

The exact checksum method is recorded once, in pages.json's top-level hashMethod; per-page records carry only the hash values.

hashMethod: bodyHash: CRC32 (hex) over the page <body>: every text node (trimmed, non-blank) and every img/iframe src attribute value, in document order. mainHash: SHA-256 (hex) over the normalized text of the <main> element: document order, tags stripped, whitespace collapsed; null when the page has no <main> element.

## Known gaps

Fixed by this export (peer-review findings): patterns.jsonl references are now core-identity ids that resolve to line ids (they kept utility classes and dangled before) and every line carries the full ancestor chain (ancestors); components.json's sample is no longer null — it carries the pattern's first-occurrence markup, and each rule also carries its ancestors, listContainer and anchorCounts; chrome is DOM-semantic (all occurrences outside <main>) instead of a selector/urlCount heuristic; pages.json states the checksum method once (top-level hashMethod) instead of per record, carries the EDS extensionless paths, the crawl's per-page meta and the page-template list; matrix.csv headers are the rules' sourcePattern selectors (ids on the second header row) and its coverage excludes chrome.

## Known limitations

- Selectors are exact matches on the core identity; renamed classes or re-wrapped elements will not resolve — treat unmatched selectors as manual work.
- residuals.json is one-off or dynamic content that no rule clustered; copy it as static content or model it as data-driven.
- EDS blocks cannot nest: a component with a non-empty containedIn (edsNested) must be flattened into its container's fields.
