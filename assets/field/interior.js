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
