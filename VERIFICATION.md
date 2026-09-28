# Verification and content provenance

Verified on 28 September 2026. This portfolio preserves the original static HTML/CSS/JavaScript architecture; it needs no build step or third-party runtime dependencies.

## Content sources

- Latest CV: the user-supplied `_Adarsh_S_CV_ (1).pdf`, copied unchanged to `assets/docs/Adarsh_S_CV.pdf`. SHA-256: `4b26afea5e71c09a21955f7fd8a230977f1bc162cc083901b86124c4389f8c10`.
- Portrait: the user-supplied `1783275687556.jpeg`, copied unchanged to `assets/images/adarsh-s.jpeg`.
- Existing portfolio and its four original case-study pages were reviewed before editing.
- Current public GitHub repositories and their READMEs were reviewed for AssentTag, EpigraphiX-AI, AegisForge-X, Deciphera and secure-note-sharing-app (QuietNote).
- IJRASET article: the exact publisher URL provided by the user is used for publication buttons. DOI `10.22214/ijraset.2026.84707` resolves to it. Crossref confirms the title, Adarsh S as author, publication on 31 August 2026, volume 14, issue 8.
- Experience, education and certification names/dates come from the replacement CV. No employer, user counts, performance claims, testimonials, or repository statistics were invented.
- QuietNote is presented as a proof of concept; Deciphera as a simulator. Security-tool descriptions avoid claims of complete vulnerability detection or standards certification.
- Reference portfolio inspected at deepakts.com for general editorial presentation only; no text, identity, images or assets were copied.

## Scope of browser verification

Chromium-based automated testing and visual review were performed under `/Adarsh-S-Portfolio/`, matching the production repository subdirectory.

- Homepage widths: 390, 430, 768, 1024, 1440 and 1920 pixels; no horizontal overflow.
- All five case studies: local navigation, linked assets, desktop layout and 390-pixel mobile width.
- Homepage, case-study and responsive screenshots reviewed.
- Mobile menu: toggle, Escape dismissal, anchor navigation and focus transfer.
- Skill category filtering and expandable certification collection.
- Theme and animation-pause preferences persist after reload.
- Reduced-motion emulation stops running animations.
- No-JavaScript navigation and project content remain accessible.
- CV download emits `Adarsh_S_CV.pdf`; source and replacement checksums match.
- Runtime errors: none. Missing local resources: none.
- Structural check: seven HTML pages, 81 local references, unique IDs, one H1 per page, valid JSON-LD and valid PDF signature.
- Automated WCAG A/AA scans: no remaining violations on the white homepage and five case studies. Automated checks do not replace a full manual accessibility audit.

## Link checks

The GitHub profile and all five project repository URLs returned HTTP 200. QuietNote’s real demo returned HTTP 200. The supplied IJRASET article URL and DOI returned HTTP 200. The photo, CSS, JavaScript, case-study pages and replacement CV served locally at their GitHub Pages-style paths.

LinkedIn returned its HTTP 999 automated-access restriction. The new CV’s URL (`https://www.linkedin.com/in/adarshs-031869355`) is used; it differs from the old portfolio URL. Manual confirmation remains useful.

A Research Square preprint URL was not found in the supplied CV, original site, project READMEs or targeted search. No speculative preprint link or metadata was added. No certificate-verification URLs were supplied, so credential entries do not pretend to link to verified certificates.

## Performance and accessibility design

- Original portrait is only about 20 KB; explicit dimensions and fetch priority avoid image layout shifts.
- System typography avoids third-party font requests.
- No animation library, analytics, API dependency or external runtime request is required.
- Offscreen sections use browser-native deferred rendering; offscreen diagram animations pause.
- Perspective effects use fine pointers; floating labels support mouse, touch and arrow keys. Motion pauses and reduced-motion preferences disable the effects.
- White is the default theme. The centered original portrait remains full color, while multicolor dimensional lettering and draggable labels provide movement.
- Portrait float, pointer tilt, changing typewriter text, scroll-linked transforms, pause/resume and system reduced motion are explicitly browser-tested.
- Photo alignment and white background verified at all six viewport widths; touch dragging verified with emulated touch events.
- Scroll handling uses requestAnimationFrame and groups geometry reads before writes.
- No blocking loader or scroll hijacking.
- Reveals do not reduce text contrast; all content exists in static HTML.
- Semantic regions, skip link, focus styles, button states and descriptive image alt text.

## SEO and hosting

Canonical URLs, unique page titles/descriptions, Open Graph and Twitter image metadata, Person/WebSite/ScholarlyArticle structured data, favicon, robots and sitemap are included. Publication metadata is sourced from Crossref and the supplied paper link.

All assets and case-study links are repository-relative. `.nojekyll` is retained. See README for local serving and GitHub Pages deployment instructions. Public hosting remains subject to GitHub Pages publishing and cache propagation.

## Testing limitations

These checks use an emulated responsive Chromium browser, not physical iOS/Android devices or a Safari/Firefox test matrix. Performance scores are local lab measurements and vary with hardware, throttling and hosting. Email and telephone links require the visitor’s configured applications. The email link is functional navigation, not a hosted message-delivery service.

## Previous revision mobile Lighthouse audit

Prior scroll-motion revision isolated Chrome/Lighthouse run: **Performance 86 / Accessibility 100 / Best Practices 100 / SEO 100**. Default mobile simulation at the local GitHub Pages-style URL. The standalone HTML report is supplied with the final deliverables.

This historical audit predates the stronger float, draggable name/photo and second typing line; it is not a new measurement of this revision. Scores are lab measurements, not guarantees for every visitor.

## Draggable motion revision

Verified name and portrait mouse dragging, arrow-key movement and Escape reset; portrait touch dragging; both typing lines changing; scroll depth; pause and reduced motion; six responsive widths without overflow; original CV download; and zero automated accessibility violations on the homepage and five case studies. The portrait now gently moves around its centered resting position.

## Full choreography revision

Revisited the supplied Deepak portfolio as a visual reference. Added a top-down portrait entrance, drag lift/lean and release wobble, experience reveals in existing document order, a progressive timeline and four on-scroll typing headings. Tested entry order, heading completion, spring animation, pause cancellation, mobile layout, reduced motion and no-JavaScript access. Runtime errors: none. This revision has no new Lighthouse measurement; the earlier score above remains historical.

## Coral frame and repeatable scroll revision

Added a separate coral portrait backdrop and layered blue edge, deeper project-card entrances and repeated scroll animations. Verified two full scroll-away/return cycles for the portrait entrance, heading typing and ordered experience sequence, plus pause visibility, mobile overflow and browser runtime errors. The previous Lighthouse measurement remains historical.

## Repeating body-text motion

81 existing text blocks now use scroll-linked depth in browsers supporting CSS view timelines, with repeat-on-entry animation elsewhere. Includes paragraphs, project headings, dates and experience bullets. Verified motion across two visits in both scroll directions and cancellation under pause/reduced motion.
