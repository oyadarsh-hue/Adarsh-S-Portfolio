/* Entrance, ordered experience reveals and scroll-triggered typing. */
(() => {
  "use strict";
  const root = document.documentElement;
  const allowed = () => !root.classList.contains("paused") && !document.hidden;
  const animations = new Set();
  const play = (el, frames, options) => {
    if (!allowed()) return;
    const a = el.animate(frames, options);
    animations.add(a);
    a.finished.catch(() => {}).finally(() => animations.delete(a));
    return a;
  };
  document
    .querySelectorAll("[data-drag-piece], [data-floating]")
    .forEach((el) => {
      let pointer = null,
        release;
      el.addEventListener("pointerdown", (e) => {
        if (!allowed() || e.button !== 0) return;
        release?.cancel();
        pointer = { x: e.clientX, id: e.pointerId };
        el.classList.add("drag-lifted");
      });
      el.addEventListener("pointermove", (e) => {
        if (pointer && allowed())
          el.style.setProperty(
            "--drag-lean",
            `${Math.max(-7, Math.min(7, (e.clientX - pointer.x) * 0.09))}deg`,
          );
      });
      const end = () => {
        if (!pointer) return;
        pointer = null;
        const lean = el.style.getPropertyValue("--drag-lean") || "0deg";
        el.classList.remove("drag-lifted");
        el.style.setProperty("--drag-lean", "0deg");
        release = play(
          el,
          [
            { rotate: lean, scale: "1.045", offset: 0 },
            { rotate: "-3deg", scale: ".98", offset: 0.32 },
            { rotate: "1.5deg", scale: "1.015", offset: 0.58 },
            { rotate: "-.5deg", scale: ".995", offset: 0.8 },
            { rotate: "0deg", scale: "1", offset: 1 },
          ],
          { duration: 650, easing: "ease-out" },
        );
      };
      ["pointerup", "pointercancel", "lostpointercapture"].forEach((event) =>
        el.addEventListener(event, end),
      );
      new MutationObserver(() => {
        if (!allowed()) {
          pointer = null;
          el.classList.remove("drag-lifted");
          el.style.setProperty("--drag-lean", "0deg");
        }
      }).observe(root, { attributes: true, attributeFilter: ["class"] });
    });

  const items = [...document.querySelectorAll("#experience .timeline-item")];
  const timeline = document.querySelector(".timeline");
  let next = 0,
    requested = -1,
    queueTimer = 0;
  function revealNext() {
    queueTimer = 0;
    if (!allowed() || next > requested || next >= items.length) return;
    const el = items[next++];
    el.classList.add("experience-shown");
    el.dataset.revealOrder = String(next);
    timeline?.style.setProperty(
      "--journey-progress",
      String(next / items.length),
    );
    play(
      el,
      [
        {
          opacity: 0,
          transform: "perspective(1000px) translate3d(0,64px,0) rotateX(12deg)",
        },
        {
          opacity: 1,
          transform: "perspective(1000px) translate3d(0,-4px,0) rotateX(-1deg)",
          offset: 0.8,
        },
        { opacity: 1, transform: "none" },
      ],
      { duration: 850, easing: "cubic-bezier(.16,1,.3,1)" },
    );
    if (next < items.length) queueTimer = setTimeout(revealNext, 320);
  }
  if ("IntersectionObserver" in window) {
    items.forEach((el) => el.classList.add("experience-pending"));
    const resetExperience = () => {
      if (!allowed()) return;
      clearTimeout(queueTimer);
      queueTimer = 0;
      next = 0;
      requested = -1;
      items.forEach((el) => {
        el.getAnimations().forEach((a) => a.cancel());
        el.classList.remove("experience-shown");
        delete el.dataset.revealOrder;
      });
      timeline?.style.setProperty("--journey-progress", "0");
    };
    const experience = document.getElementById("experience");
    if (experience)
      new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) resetExperience();
      }).observe(experience);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting)
            requested = Math.max(requested, items.indexOf(entry.target));
        });
        if (!queueTimer && next <= requested) revealNext();
      },
      { threshold: 0.08, rootMargin: "0px 0px -8% 0px" },
    );
    items.forEach((el) => observer.observe(el));
  }

  // Keep an invisible full-size copy to reserve wrapping and avoid layout jumps.
  const typeStates = [];
  document.querySelectorAll("[data-scroll-type]").forEach((el) => {
    const text = el.textContent;
    const original = document.createElement("span");
    original.className = "typing-original";
    original.textContent = text;
    const visual = document.createElement("span");
    visual.className = "typing-visual";
    visual.setAttribute("aria-hidden", "true");
    visual.textContent = text;
    el.replaceChildren(original, visual);
    const state = { el, text, visual, timer: 0, index: 0, started: false };
    typeStates.push(state);
    const finish = () => {
      clearTimeout(state.timer);
      visual.textContent = text;
      el.classList.remove("typing-active");
    };
    state.finish = finish;
    function tick() {
      if (!allowed()) {
        finish();
        return;
      }
      visual.textContent = text.slice(0, ++state.index);
      if (state.index < text.length) state.timer = setTimeout(tick, 65);
      else el.classList.remove("typing-active");
    }
    if ("IntersectionObserver" in window)
      new IntersectionObserver(
        (entries, observer) => {
          if (entries.some((e) => e.isIntersecting) && !state.started) {
            state.started = true;
            state.index = 0;
            if (allowed()) {
              el.classList.add("typing-active");
              visual.textContent = "";
              tick();
            }
          } else if (entries.every((e) => !e.isIntersecting)) {
            finish();
            state.started = false;
            state.index = 0;
          }
        },
        { threshold: [0, 0.5] },
      ).observe(el);
  });
  const arrival = document.querySelector(".portrait-arrival");
  if (arrival && "IntersectionObserver" in window) {
    const anchor = document.querySelector(".center-portrait");
    new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && allowed())
          arrival.classList.add("arrival-active");
        else if (!entry.isIntersecting)
          arrival.classList.remove("arrival-active");
      },
      { threshold: 0.12 },
    ).observe(anchor);
  }
  function stop() {
    if (allowed()) return;
    animations.forEach((a) => a.cancel());
    clearTimeout(queueTimer);
    queueTimer = 0;
    items.forEach((el) => el.classList.add("experience-shown"));
    next = items.length;
    timeline?.style.setProperty("--journey-progress", "1");
    typeStates.forEach((s) => s.finish());
  }
  new MutationObserver(stop).observe(root, {
    attributes: true,
    attributeFilter: ["class"],
  });
  document.addEventListener("visibilitychange", stop);
  stop();
})();
