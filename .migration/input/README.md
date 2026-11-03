# EDS migration input

- Crawl date: 2026-11-02
- Glowworm version: 1.0-SNAPSHOT
- Source URL: https://wknd-adventures.com
- Pages: 22 unique, 3 skipped, 0 errors

## How selectors and counts are computed

- Selectors use a core identity: each element's identity is its tag plus its content-semantic classes (alphabetized). Utility/layout classes (utility-*, margin-*, padding-*, grid-gap-*, grid-align-*, column-count classes, and data-driven layout variants) are excluded from the identity and recorded as variants, so a component keeps one id across layout variants.
- Counts are instances, not pages: a component's totalCount is its site-wide instance count, perPage/matrix cells are per-page instance counts from the per-URL occurrence grouping, and matrix coverage is the number of distinct components present on the page.

## Checksums

Each page carries a content checksum; the exact method is recorded per crawl.
checksumMethod: bodyHash: CRC32 (hex) over the page <body>: every text node (trimmed, non-blank) and every img/iframe src attribute value, in document order. mainHash: SHA-256 (hex) over the normalized text of the <main> element: document order, tags stripped, whitespace collapsed; null when the page has no <main> element.

## Known limitations

- Selectors are exact matches on the core identity; renamed classes or re-wrapped elements will not resolve — treat unmatched selectors as manual work.
- residuals.json is one-off or dynamic content that no rule clustered; copy it as static content or model it as data-driven.
- EDS blocks cannot nest: a component with a non-empty containedIn (edsNested) must be flattened into its container's fields.
- The chrome flag in patterns.jsonl is a conservative heuristic (site-wide presence or nav/footer family ids); review before deleting chrome candidates.
