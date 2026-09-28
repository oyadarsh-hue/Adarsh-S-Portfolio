# Adarsh S — Engineering, AI & Research

A personal portfolio for Adarsh S. Static HTML, CSS and JavaScript, compatible with GitHub Pages at **https://oyadarsh-hue.github.io/Adarsh-S-Portfolio/**.

## Included

- Supplied portrait and updated, original CV PDF.
- Hero, profile, projects, experience, research, toolkit, certifications, education, GitHub and contact.
- Five case studies: AssentTag, EpigraphiX-AI, AegisForge-X, Deciphera and QuietNote.
- Verified IJRASET publication link and DOI metadata.
- Dark/light themes, responsive navigation, skill filters and expandable credentials.
- Kinetic hero text, reveals, ticker, conceptual project diagrams, pointer spotlight, magnetic buttons, contextual cursor labels and scroll progress.
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
| `assets/images/adarsh-s.jpeg` | Original supplied portrait |
| `assets/images/social-preview.png` | Social sharing image |
| `assets/docs/Adarsh_S_CV.pdf` | Original replacement CV |
| `projects/*.html` | Five standalone case studies |
| `sitemap.xml`, `robots.txt`, `404.html` | Search and hosting support |
| `scripts/check-site.mjs` | Dependency-free structural verification |
| `VERIFICATION.md` | Test results, provenance and limitations |

Dark mode is the initial theme. Theme and motion preferences are saved locally when storage is available. Content stays readable if scripts or storage are disabled. Contact opens the visitor’s email application; no contact backend or inert form is included.

The portrait is displayed in grayscale through CSS, with color on desktop hover. The original JPEG is preserved. Project diagrams are original conceptual illustrations, not application screenshots.
