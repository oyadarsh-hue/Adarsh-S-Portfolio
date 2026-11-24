(() => {
  const root = document.documentElement;
  const theme = document.getElementById("themeButton");
  const motion = document.getElementById("motionButton");
  const dark = matchMedia("(prefers-color-scheme: dark)");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  const themeKey = "adarsh-theme-v2";
  const motionKey = "adarsh-motion";

  function read(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, value); } catch { /* Retain this page's choice in memory. */ }
  }

  let chosenTheme = read(themeKey);
  let paused = read(motionKey) === "paused";
  function showTheme() {
    const saved = chosenTheme === "light" || chosenTheme === "dark";
    const isDark = saved ? chosenTheme === "dark" : dark.matches;
    root.dataset.theme = isDark ? "dark" : "light";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", isDark ? "#111116" : "#f5f2eb");
    if (theme) {
      theme.setAttribute("aria-checked", String(isDark));
      theme.title = isDark ? "Switch to light theme" : "Switch to dark theme";
    }
  }
  function showMotion() {
    const still = paused || reduced.matches;
    root.classList.toggle("paused", still);
    if (motion) {
      const label = reduced.matches ? "Reduced motion enabled by system" : paused ? "Enable animation" : "Pause animation";
      motion.title = label;
      motion.setAttribute("aria-label", label);
      motion.setAttribute("aria-pressed", String(still));
      motion.disabled = reduced.matches;
      motion.firstElementChild.textContent = still ? "▷" : "Ⅱ";
    }
  }
  theme?.addEventListener("click", () => {
    chosenTheme = root.dataset.theme === "dark" ? "light" : "dark";
    save(themeKey, chosenTheme);
    showTheme();
  });
  motion?.addEventListener("click", () => {
    paused = !paused;
    save(motionKey, paused ? "paused" : "enabled");
    showMotion();
  });
  dark.addEventListener("change", showTheme);
  reduced.addEventListener("change", showMotion);
  addEventListener("storage", event => {
    if (event.key === themeKey || event.key === null) {
      chosenTheme = read(themeKey);
      showTheme();
    }
    if (event.key === motionKey || event.key === null) {
      paused = read(motionKey) === "paused";
      showMotion();
    }
  });
  showTheme();
  showMotion();
  const controls = document.querySelector(".folio-prefs");
  if (controls) controls.hidden = false;

  if ("IntersectionObserver" in window) {
    const entrances = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("appeared");
        entrances.unobserve(entry.target);
      }
    });
    document.querySelectorAll("main h1, main h2, .role-card, .evidence-grid > div").forEach(el => entrances.observe(el));
  }
  const chapterNav = document.querySelector(".case-jump, .reader-jump, .tool-jump");
  if (chapterNav) {
    const chapters = Array.from(chapterNav.querySelectorAll('a[href^="#"]'), link => ({
      link,
      section: document.getElementById(link.hash.slice(1))
    })).filter(chapter => chapter.section);
    let current = null;
    let pending = false;
    function markChapter() {
      pending = false;
      const threshold = Math.min(200, innerHeight * .24);
      let active = null;
      for (const chapter of chapters) {
        if (chapter.section.getBoundingClientRect().top <= threshold) active = chapter.link;
      }
      if (scrollY + innerHeight >= document.documentElement.scrollHeight - 3) active = chapters.at(-1)?.link || active;
      if (current === active) return;
      current?.removeAttribute("aria-current");
      active?.setAttribute("aria-current", "location");
      current = active;
    }
    function queueChapter() {
      if (!pending) {
        pending = true;
        requestAnimationFrame(markChapter);
      }
    }
    addEventListener("scroll", queueChapter, {passive:true});
    addEventListener("resize", queueChapter, {passive:true});
    markChapter();
  }
  // Update only the visible cover and chapter artwork. Transform descendants so the
  // section's scroll position and the bounds of its controls remain stable.
  const scenes = document.querySelectorAll("[data-ed-stage], main .chapter, main .summary-section, main .tool-section");
  if (scenes.length && "IntersectionObserver" in window) {
    const visible = new Set();
    let frame = 0;
    function render() {
      frame = 0;
      if (paused || reduced.matches) return;
      const shortScreen = innerWidth <= 600;
      const updates = Array.from(visible, el => ({el, rect:el.getBoundingClientRect()}));
      for (const {el, rect} of updates) {
        if (el.hasAttribute("data-ed-stage")) {
          const gone = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height)));
          el.style.setProperty("--title-x", (gone * (shortScreen ? 22 : 70)).toFixed(1) + "px");
          el.style.setProperty("--hinge-angle", (-2 + gone * 5).toFixed(2) + "deg");
          el.style.setProperty("--title-y", (-gone * (shortScreen ? 22 : 39)).toFixed(1) + "px");
          const photoOffset = (gone * Math.min(24, rect.height * .034)).toFixed(1) + "px";
          el.style.setProperty("--cover-shift", photoOffset);
          el.style.setProperty("--photo-y", photoOffset);
        } else {
          const through = Math.max(0, Math.min(1, (innerHeight - rect.top) / (innerHeight + rect.height)));
          const phase = 2 * through - 1;
          el.style.setProperty("--type-flow", (phase * (shortScreen ? 8 : 28)).toFixed(1) + "px");
          el.style.setProperty("--hinge-angle", (phase * 4.5).toFixed(2) + "deg");
          el.style.setProperty("--type-lift", (-phase * 10).toFixed(1) + "px");
          el.style.setProperty("--band-shift", (phase * 8).toFixed(1) + "px");
        }
      }
    }
    function requestRender() {
      if (!frame && visible.size && !paused && !reduced.matches) frame = requestAnimationFrame(render);
    }
    const visibility = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      requestRender();
    }, {rootMargin:"100px 0px"});
    scenes.forEach(scene => visibility.observe(scene));
    addEventListener("scroll", requestRender, {passive:true});
    addEventListener("resize", requestRender, {passive:true});
    motion?.addEventListener("click", requestRender);
    reduced.addEventListener("change", requestRender);
    addEventListener("storage", requestRender);
  }
  for (const [stageSelector, printSelector] of [
    [".case-art-stage", ".case-art"],
    [".summary-art", ".summary-photo-frame"],
    [".tool-intro-note", ".tool-hero-photo"]
  ]) {
    const stage = document.querySelector(stageSelector);
    const print = stage?.querySelector(printSelector);
    if (!print) continue;
    stage.addEventListener("pointermove", event => {
      if (!fine.matches || paused || reduced.matches) return;
      const box = stage.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - 0.5;
      const y = (event.clientY - box.top) / box.height - 0.5;
      print.style.setProperty("--rx", (-y * 7).toFixed(2) + "deg");
      print.style.setProperty("--ry", (x * 9).toFixed(2) + "deg");
    }, { passive: true });
    stage.addEventListener("pointerleave", () => {
      print.style.removeProperty("--rx");
      print.style.removeProperty("--ry");
    });
  }
})();
