# Photographic backgrounds

Four AI-generated decorative environments match the existing navy, lavender and cyan palette. They appear behind the hero, sticky story, research and contact sections.

The generator returned 1672 × 941 images. The 3840 × 2160 versions are high-quality Lanczos upscales, **not native 4K generated detail**. These are concept images, not photographs of real equipment, historical documents or a specific coast. See `sources.json` for provenance.

Native picture/srcset selection serves 960px images on phones and 1600/2560/3840px versions on larger screens. Each WebP is below 250 KB. Below-fold pictures are lazy loaded.

The motion controller uses one event-driven animation frame, only updates visible scenes and never intercepts scrolling. The existing pause control, reduced motion, hidden tabs and data-saving preferences disable additional motion. Static artwork remains without JavaScript. Printing omits decorative images.

Run `node scripts/check-backgrounds.mjs` for asset/controller checks and `python scripts/browser-backgrounds.py` for desktop/mobile, wide-screen, painted-image, reverse-scroll, pause and fallback verification.
