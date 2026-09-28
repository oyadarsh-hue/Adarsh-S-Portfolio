# Adarsh S — Engineering, AI & Research

A personal portfolio for Adarsh S. Static HTML, CSS and JavaScript, compatible with GitHub Pages at **https://oyadarsh-hue.github.io/Adarsh-S-Portfolio/**.

## Included

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
