/* Enhancements are optional: content and navigation remain usable without JS. */
(() => {
  "use strict";
  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const stored = (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };
  const remember = (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* Private browsing is supported. */
    }
  };
  root.classList.add("js");
  if (stored("adarsh-theme") === "light") root.dataset.theme = "light";
  let manuallyPaused = stored("adarsh-motion") === "paused";
  const motionAllowed = () => !reducedMotion.matches && !manuallyPaused;
  const motionButton = document.getElementById("motionButton");
  const themeButton = document.getElementById("themeButton");
  function syncPreferences() {
    root.classList.toggle("paused", !motionAllowed());
    if (motionButton) {
      motionButton.setAttribute("aria-pressed", String(!motionAllowed()));
      motionButton.setAttribute(
        "aria-label",
        reducedMotion.matches
          ? "Reduced motion enabled by system"
          : manuallyPaused
            ? "Enable animation"
            : "Pause animation",
      );
      motionButton.textContent = motionAllowed() ? "Ⅱ" : "▷";
      motionButton.disabled = reducedMotion.matches;
    }
    if (themeButton)
      themeButton.setAttribute(
        "aria-label",
        `Switch to ${root.dataset.theme === "light" ? "dark" : "light"} theme`,
      );
  }
  syncPreferences();
  reducedMotion.addEventListener("change", syncPreferences);
  motionButton?.addEventListener("click", () => {
    manuallyPaused = !manuallyPaused;
    remember("adarsh-motion", manuallyPaused ? "paused" : "enabled");
    syncPreferences();
  });
  themeButton?.addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
    remember("adarsh-theme", root.dataset.theme);
    syncPreferences();
  });

  const menu = document.getElementById("menuButton");
  const nav = document.getElementById("nav");
  function closeMenu(returnFocus = false) {
    nav?.classList.remove("open");
    menu?.setAttribute("aria-expanded", "false");
    if (returnFocus) menu?.focus();
  }
  menu?.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menu.setAttribute("aria-expanded", String(open));
  });
  nav?.querySelectorAll("a").forEach((link) =>
    link.addEventListener("click", () => {
      closeMenu();
      const target = document.querySelector(link.hash);
      if (target) {
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      }
    }),
  );
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav?.classList.contains("open"))
      closeMenu(true);
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".topbar")) closeMenu();
  });
  window
    .matchMedia("(min-width: 1001px)")
    .addEventListener("change", () => closeMenu());

  const header = document.querySelector(".topbar");
  const progress = document.querySelector(".scroll-progress");
  const footerWord = document.querySelector(".footer-word");
  const sections = [...document.querySelectorAll("main > section[id]")];
  let scrollFrame = 0;
  function updateScroll() {
    scrollFrame = 0;
    const max = Math.max(1, root.scrollHeight - window.innerHeight);
    let active = sections[0]?.id;
    for (const section of sections)
      if (section.getBoundingClientRect().top <= 160) active = section.id;
    const distance =
      footerWord && motionAllowed() && finePointer.matches
        ? footerWord.getBoundingClientRect().top - window.innerHeight
        : 0;
    if (progress)
      progress.style.transform = `scaleX(${Math.min(1, Math.max(0, window.scrollY / max))})`;
    header?.classList.toggle("scrolled", window.scrollY > 24);
    nav?.querySelectorAll("a").forEach((link) => {
      if (link.hash === `#${active}`)
        link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
    if (footerWord && motionAllowed() && finePointer.matches) {
      if (distance < 0)
        footerWord.style.setProperty(
          "--footer-shift",
          `${Math.max(-12, distance * 0.012)}px`,
        );
    }
  }
  const scheduleScroll = () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
  };
  window.addEventListener("scroll", scheduleScroll, { passive: true });
  window.addEventListener("resize", scheduleScroll, { passive: true });
  nav
    ?.querySelector('a[href="#home"]')
    ?.setAttribute("aria-current", "location");

  if ("IntersectionObserver" in window) {
    const visualObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.target.classList.toggle("is-visible", entry.isIntersecting));
    });
    document.querySelectorAll('.project-visual').forEach(el => visualObserver.observe(el));
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          if (motionAllowed()) entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }),
      { threshold: 0.08 },
    );
    document
      .querySelectorAll(
        ".section-heading, .project-card, .timeline-item, .publication-card, .education-grid",
      )
      .forEach((el) => observer.observe(el));
  }
  document.querySelectorAll("[data-filter]").forEach((button) =>
    button.addEventListener("click", () => {
      document
        .querySelectorAll("[data-filter]")
        .forEach((other) =>
          other.setAttribute("aria-pressed", String(other === button)),
        );
      document.querySelectorAll("[data-category]").forEach((card) => {
        card.hidden =
          button.dataset.filter !== "all" &&
          card.dataset.category !== button.dataset.filter;
      });
      scheduleScroll();
    }),
  );

  const cursor = document.querySelector(".cursor-label");
  let pointerFrame = 0;
  let pointerEvent;
  document.addEventListener(
    "pointermove",
    (event) => {
      if (!finePointer.matches || !motionAllowed()) return;
      pointerEvent = event;
      if (pointerFrame) return;
      pointerFrame = requestAnimationFrame(() => {
        pointerFrame = 0;
        const { clientX, clientY, target } = pointerEvent;
        const card = target.closest(".spotlight");
        if (card) {
          const rect = card.getBoundingClientRect();
          card.style.setProperty("--pointer-x", `${clientX - rect.left}px`);
          card.style.setProperty("--pointer-y", `${clientY - rect.top}px`);
        }
        const link = target.closest("a");
        let label = link?.dataset.cursor || "";
        if (link?.href.includes("github.com")) label = "OPEN";
        if (
          link?.href.includes("ijraset.com") ||
          link?.href.includes("doi.org")
        )
          label = "READ";
        if (cursor) {
          cursor.textContent = label;
          cursor.classList.toggle("visible", !!label);
          cursor.style.transform = `translate(${clientX + 16}px, ${clientY + 16}px)`;
        }
      });
    },
    { passive: true },
  );
  document.addEventListener("pointerleave", () =>
    cursor?.classList.remove("visible"),
  );
  document.querySelectorAll(".magnetic").forEach((button) => {
    button.addEventListener(
      "pointermove",
      (event) => {
        if (!finePointer.matches || !motionAllowed()) return;
        const rect = button.getBoundingClientRect();
        const x = Math.max(
          -3,
          Math.min(3, (event.clientX - rect.left - rect.width / 2) * 0.035),
        );
        const y = Math.max(
          -3,
          Math.min(3, (event.clientY - rect.top - rect.height / 2) * 0.06),
        );
        button.style.transform = `translate(${x}px, ${y}px)`;
      },
      { passive: true },
    );
    button.addEventListener("pointerleave", () => {
      button.style.transform = "";
    });
  });
})();
