/* Native scroll, progressive enhancement, and one shared motion preference. */
(() => {
  "use strict";
  const root = document.documentElement;
  const stage = document.querySelector(".creative-stage");
  const portrait = document.querySelector(".portrait-depth");
  const typed = document.getElementById("typed-role");
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  const allowed = () => !root.classList.contains("paused") && !document.hidden;
  let heroVisible = true;
  let frame = 0;
  const active = new Set();
  const targets = [
    ...document.querySelectorAll(
      ".section-heading, .project-visual, .publication-card, .profile-facts, .education-grid",
    ),
  ];
  targets.forEach((el, i) => {
    el.classList.add("scroll-depth");
    el.dataset.depthDirection = i % 2 ? "1" : "-1";
  });
  function paint() {
    frame = 0;
    if (!allowed()) return;
    const height = innerHeight;
    // Read geometry before writes. Only visible elements participate.
    const positions = [...active].map((el) => ({
      el,
      rect: el.getBoundingClientRect(),
    }));
    const heroTop =
      heroVisible && stage ? stage.getBoundingClientRect().top : 0;
    if (stage && heroVisible) {
      const travel = Math.max(0, Math.min(1, -heroTop / height));
      stage.style.setProperty("--hero-travel", String(travel));
    }
    positions.forEach(({ el, rect }) => {
      const t = Math.max(
        -1,
        Math.min(1, (rect.top + rect.height / 2 - height / 2) / height),
      );
      el.style.setProperty("--depth-y", `${t * 42}px`);
      el.style.setProperty("--depth-rx", `${-t * 9}deg`);
      el.style.setProperty(
        "--depth-rz",
        `${t * Number(el.dataset.depthDirection) * 1.8}deg`,
      );
    });
  }
  function schedule() {
    if (!frame && allowed()) frame = requestAnimationFrame(paint);
  }
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ target, isIntersecting }) => {
          if (isIntersecting) active.add(target);
          else active.delete(target);
        });
      },
      { rootMargin: "80px" },
    );
    targets.forEach((el) => observer.observe(el));
    if (stage)
      new IntersectionObserver(([entry]) => {
        heroVisible = entry.isIntersecting;
        stage.classList.toggle("motion-offscreen", !heroVisible);
        syncTyping();
      }).observe(stage);
  }
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule, { passive: true });
  // The outer layer follows the pointer; the inner layer floats independently.
  let pointerFrame = 0;
  stage?.addEventListener(
    "pointermove",
    (event) => {
      if (!allowed() || !fine.matches || pointerFrame) return;
      const { clientX, clientY } = event;
      pointerFrame = requestAnimationFrame(() => {
        pointerFrame = 0;
        if (!allowed()) return;
        const r = stage.getBoundingClientRect();
        portrait?.style.setProperty(
          "--portrait-rx",
          `${(0.5 - (clientY - r.top) / r.height) * 14}deg`,
        );
        portrait?.style.setProperty(
          "--portrait-ry",
          `${((clientX - r.left) / r.width - 0.5) * 20}deg`,
        );
      });
    },
    { passive: true },
  );
  stage?.addEventListener("pointerleave", () => {
    portrait?.style.setProperty("--portrait-rx", "0deg");
    portrait?.style.setProperty("--portrait-ry", "0deg");
  });
  const phrases = [
    "full-stack applications.",
    "computer vision systems.",
    "research into real tools.",
  ];
  let phrase = 0,
    length = phrases[0].length,
    deleting = true,
    timer = 0;
  function tick() {
    timer = 0;
    if (!allowed() || !heroVisible || !typed) return;
    length += deleting ? -1 : 1;
    typed.textContent = phrases[phrase].slice(0, length);
    let delay = deleting ? 38 : 78;
    if (length === 0) {
      deleting = false;
      phrase = (phrase + 1) % phrases.length;
      delay = 280;
    } else if (length === phrases[phrase].length && !deleting) {
      deleting = true;
      delay = 2200;
    }
    timer = setTimeout(tick, delay);
  }
  function syncTyping() {
    clearTimeout(timer);
    timer = 0;
    if (!typed) return;
    if (!allowed()) {
      typed.textContent = phrases[0];
      phrase = 0;
      length = phrases[0].length;
      deleting = true;
    } else if (heroVisible) timer = setTimeout(tick, 1800);
  }
  new MutationObserver(() => {
    syncTyping();
    schedule();
  }).observe(root, { attributes: true, attributeFilter: ["class"] });
  document.addEventListener("visibilitychange", () => {
    syncTyping();
    schedule();
  });
  syncTyping();
})();
