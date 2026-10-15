# Adarsh S — Engineering, AI & Research

A personal portfolio for Adarsh S. Static HTML, CSS and JavaScript, compatible with GitHub Pages at **https://oyadarsh-hue.github.io/Adarsh-S-Portfolio/**.

## Included

- New engineering lab at `lab.html`: step through competing one-time note readers and compute/compare real SHA-256 digests in the browser.
- New opportunity workbench at `workbench.html`: map requirement terms to evidence, compare up to three projects, share a selection and export a tailored project brief as text or print/PDF.
- A concise recruiter overview at `recruiter.html`, with CV, contact, printable summary and project evidence.
- Role-based project filters, searchable tools/topics, shareable filter URLs and accessible result announcements.
- Implementation and test-source links, review scenarios, scope and next engineering steps for every case study.
- Supplied portrait and updated, original CV PDF.
- Hero, profile, projects, experience, research, toolkit, certifications, education, GitHub and contact.
- Five case studies: AssentTag, EpigraphiX-AI, AegisForge-X, Deciphera and QuietNote.
- Verified IJRASET publication link and DOI metadata.
- Dark/light themes, responsive navigation, skill filters and expandable credentials.
- Dimensional multicolor hero lettering, cursor-driven perspective, floating draggable labels, 3D project-card tilt, reveals, ticker, conceptual project diagrams, pointer spotlight, magnetic buttons, contextual cursor labels and scroll progress.
- Draggable name and portrait, staggered letter waves, stronger portrait float, scroll-linked depth and two typewriter introductions. Drag with mouse/touch, use arrow keys, or press Escape/Enter/Space to reset the name and photo.
- Coral portrait frame with a blue 3D edge, top-down portrait entrance, drag lift and release wobble, ordered experience reveals, a progressing timeline and four scroll-triggered typing headings.
- Section, portrait, experience and typing animations replay after scrolling away and returning.
- System reduced-motion support and a persistent animation-pause button.
- Keyboard navigation, visible focus, semantic content and no-JavaScript fallbacks.
- Canonical URLs, social preview, JSON-LD, favicon, sitemap and robots file.

## Run locally

No build step, framework or runtime dependencies are needed. From the repository directory:

```sh
python -m http.server 8000
```

Open **http://localhost:8000/**. Use `python3` if needed on macOS/Linux. Opening `index.html` directly also works, but a local server is recommended.

Optional structural verification, using Node.js:

```sh
node scripts/check-site.mjs
node scripts/check-recruiter.mjs
node scripts/check-tools.mjs
node --check assets/js/main.js
node --check assets/js/motion.js
node --check assets/js/choreography.js
```

## GitHub Pages

1. Keep these files at the repository root on `main`.
2. In **Settings → Pages**, choose **Deploy from a branch**, **main**, **/(root)**.
3. Save and wait for the Pages deployment to finish.
4. Check the homepage, a nested case-study URL and `assets/docs/Adarsh_S_CV.pdf`.

The `.nojekyll` file is intentional. Relative assets and links support the repository subdirectory. The 404 page uses the explicit public portfolio URL because it can be served at arbitrary nested paths.

## Editing

| File | Purpose |
|---|---|
| `index.html` | Homepage and structured data |
| `assets/css/style.css` | Design tokens, themes, layout and motion |
| `assets/js/main.js` | Optional interaction enhancements |
| `assets/js/motion.js` | Portrait tilt, scroll depth and typewriter motion |
| `assets/js/choreography.js` | Drag spring, sequential experience and heading typing |
| `assets/images/adarsh-s.jpeg` | Original supplied portrait |
| `assets/images/social-preview.png` | Social sharing image |
| `assets/docs/Adarsh_S_CV.pdf` | Original replacement CV |
| `projects/*.html` | Five standalone case studies |
| `sitemap.xml`, `robots.txt`, `404.html` | Search and hosting support |
| `scripts/check-site.mjs` | Dependency-free structural verification |
| `VERIFICATION.md` | Test results, provenance and limitations |

White is the initial theme; dark mode remains optional. Theme and motion preferences are saved locally when storage is available. Content stays readable if scripts or storage are disabled. Contact opens the visitor’s email application; no contact backend or inert form is included.

The supplied portrait is centered, gently animated and displayed in full color, with no grayscale filter. The original JPEG is preserved. Project diagrams are original conceptual illustrations, not application screenshots.

## Interactive color edition

The white-first design uses distinct blue, coral, violet and green accents. On desktop, drag the floating hero labels. Keyboard users can focus a label and use arrow keys; Escape restores its position. On touch devices, drag a label with a finger; the rest of the page retains natural scrolling. The pause control and system reduced-motion setting disable animation and movement. Theme preference uses a new storage key so the previous dark default does not override this revision.

## Repeating body-text motion

Existing text blocks now use scroll-linked depth in browsers supporting CSS view timelines, with repeat-on-entry animation elsewhere. Includes paragraphs, project headings, dates and experience bullets. Verified motion across two visits in both scroll directions and cancellation under pause/reduced motion.

## Education and project presentation

Education uses the same replayable timeline as experience, ordered MCA, B.Sc. Computer Science, Class 12 (Biology) and Class 10. Dates, institutions and grades come from the supplied CV. All five project titles and taglines type again on scroll re-entry, with dimensional title styling and a subtle animated dot texture.

## Continuous project typing

Project titles and taglines remain complete and readable. Decorative hero motion and section reveals remain available with the existing pause and reduced-motion controls. The body content plane stays fixed while scrolling.

## Contact icons and heading motion

Visible GitHub, LinkedIn, Gmail and phone links use inline SVG marks, avoiding external icon requests. Brand glyphs: Simple Icons (GitHub/Gmail, and LinkedIn from v11.15.0); phone: Lucide. Section headings reveal word by word in 3D each time they enter the viewport. Motion respects pause and reduced-motion preferences.

## Recruiter overview and evidence

Share **https://oyadarsh-hue.github.io/Adarsh-S-Portfolio/recruiter.html** for a concise first review, or the homepage for the complete visual portfolio. The summary supports browser printing and PDF saving. Email copying falls back to visible text when clipboard access is unavailable.

Project filters combine a role and search terms. URLs such as `index.html?focus=web#projects` restore the selected view. All projects remain visible when JavaScript is disabled; inactive search controls stay hidden. Download links preserve the original CV bytes and suggest the filename **Adarsh S CV.pdf**.

Each case study links to source snapshots. Scope labels distinguish an academic application, research prototype, local review tool, browser simulator and deployed assessment POC. The public EpigraphiX-AI Python engine uses simulated attention and deterministic character mapping; this portfolio does not claim that it demonstrates trained TrOCR inference or independently reproduces the paper's benchmark results.

## Automated verification

`.github/workflows/quality.yml` runs structural, JavaScript syntax, project search and scroll-geometry checks. A separate browser job installs pinned Playwright tooling for QA only; the website still has no runtime dependencies. It checks desktop/mobile layouts, filters and deep links, menu navigation, theme persistence, static project headings, no-JavaScript content, system reduced motion, clipboard/storage fallback and case-study evidence.

To run browser checks locally after installing Python and Playwright:

```sh
python -m pip install playwright==1.58.0
python -m playwright install chromium
python scripts/browser-smoke.py
python scripts/browser-tools.py
```

Screenshots, a print PDF and the browser report are uploaded as the `portfolio-browser-evidence` Actions artifact for 14 days. Test output is kept out of the published source.

## Opportunity workbench and engineering lab

The homepage and recruiter overview link to both new pages. `assets/js/workbench-data.js` contains a curated, editable project-evidence catalog. Requirement matching uses explicit aliases and token boundaries; it does not interpret negation, seniority or general language, and produces no hiring/ATS score. Unsupported catalog terms are shown as having no linked project evidence, not as claims about all the candidate's skills. The suggested shortlist ranks projects by the number of matched catalog terms, with stable catalog order for ties.

Comparison links include only validated project IDs. Job text, company and role stay in the current tab and are not stored or sent. Briefs use the selected project evidence and scope; they accompany the original CV. All user-entered text is rendered as text, with clipboard fallback and plain-text download. Use the browser print dialog to save the focused brief as a PDF.

The race experiment is a deterministic interleaving model, not a database benchmark or simultaneous network requests. Every unsafe read precedes every write, exposing stale permission; the atomic model permits one conditional claim. Expired and revoked states deny all readers. The integrity tool uses Web Crypto SHA-256 over exact UTF-8 text and compares it with an in-memory baseline. It is an integrity demonstration, not encryption or proof of authorship. It requires HTTPS or localhost and shows an explicit fallback if Web Crypto is unavailable.

New files: `workbench.html`, `lab.html`, `assets/css/workbench.css`, `assets/js/workbench-data.js`, `assets/js/workbench.js` and `assets/js/lab.js`. Node checks cover matching boundaries, unknown evidence, share selection validation, brief content, race invariants and SHA-256 vectors. Browser checks exercise actual controls, downloads, print, layouts, no-JavaScript content, reduced motion and restricted storage/clipboard/crypto contexts.
