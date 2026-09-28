/* Native scroll, progressive enhancement, and one shared motion preference. */
(() => {
  "use strict";
  const root = document.documentElement;
  const stage = document.querySelector(".creative-stage");
  const portrait = document.querySelector(".portrait-depth");
  const typed = document.getElementById("typed-role");
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  const allowed = () => !root.classList.contains("paused") && !document.hidden;
  document.querySelectorAll("[data-drag-piece]").forEach((el) => {
    let x = 0,
      y = 0,
      drag = null;
    const place = (nx, ny) => {
      const r = el.getBoundingClientRect();
      const left = r.left - x,
        right = r.right - x;
      x = Math.max(
        Math.min(0, 12 - left),
        Math.min(
          Math.max(0, innerWidth - 12 - right),
          Math.max(-90, Math.min(90, nx)),
        ),
      );
      y = Math.max(-40, Math.min(40, ny));
      el.style.setProperty("--piece-x", `${x}px`);
      el.style.setProperty("--piece-y", `${y}px`);
    };
    const reset = () => place(0, 0);
    el.addEventListener("pointerdown", (e) => {
      if (!allowed() || e.button !== 0) return;
      drag = { x, y, px: e.clientX, py: e.clientY };
      el.setPointerCapture(e.pointerId);
      el.classList.add("piece-grabbed");
    });
    el.addEventListener("pointermove", (e) => {
      if (drag && allowed())
        place(drag.x + e.clientX - drag.px, drag.y + e.clientY - drag.py);
    });
    const end = () => {
      drag = null;
      el.classList.remove("piece-grabbed");
    };
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((name) =>
      el.addEventListener(name, end),
    );
    el.addEventListener("dblclick", reset);
    el.addEventListener("keydown", (e) => {
      if (["Escape", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        reset();
        return;
      }
      const delta = {
        ArrowLeft: [-12, 0],
        ArrowRight: [12, 0],
        ArrowUp: [0, -12],
        ArrowDown: [0, 12],
      }[e.key];
      if (delta && allowed()) {
        e.preventDefault();
        place(x + delta[0], y + delta[1]);
      }
    });
    addEventListener("resize", reset, { passive: true });
    new MutationObserver(() => {
      if (!allowed()) {
        end();
        reset();
      }
    }).observe(root, { attributes: true, attributeFilter: ["class"] });
  });
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
  // A second, independent typing line keeps the introduction lively.
  const greeting = document.getElementById("typed-greeting");
  const greetings = [
    "Hello, world. I’m",
    "Code. Create. Explore.",
    "Ideas into experiences.",
  ];
  let greetingIndex = 0,
    greetingLength = greetings[0].length,
    erasing = true,
    greetingTimer;
  function greetingTick() {
    if (!greeting || !allowed() || !heroVisible) {
      greetingTimer = null;
      return;
    }
    greetingLength += erasing ? -1 : 1;
    greeting.textContent = greetings[greetingIndex].slice(0, greetingLength);
    let delay = erasing ? 45 : 95;
    if (!greetingLength) {
      erasing = false;
      greetingIndex = (greetingIndex + 1) % greetings.length;
      delay = 300;
    } else if (greetingLength === greetings[greetingIndex].length && !erasing) {
      erasing = true;
      delay = 2400;
    }
    greetingTimer = setTimeout(greetingTick, delay);
  }
  function syncGreeting() {
    clearTimeout(greetingTimer);
    if (!greeting) return;
    if (!allowed()) {
      greeting.textContent = greetings[0];
      greetingIndex = 0;
      greetingLength = greetings[0].length;
      erasing = true;
    } else if (heroVisible) greetingTimer = setTimeout(greetingTick, 2600);
  }
  new MutationObserver(syncGreeting).observe(root, {
    attributes: true,
    attributeFilter: ["class"],
  });
  if (stage)
    new MutationObserver(syncGreeting).observe(stage, {
      attributes: true,
      attributeFilter: ["class"],
    });
  document.addEventListener("visibilitychange", syncGreeting);
  syncGreeting();
})();
