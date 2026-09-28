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

  const sequenceStops = [];
  function setupSequence(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    const items = [...section.querySelectorAll(".timeline-item")];
    const timeline = section.querySelector(".timeline");
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
            transform:
              "perspective(1000px) translate3d(0,64px,0) rotateX(12deg)",
          },
          {
            opacity: 1,
            transform:
              "perspective(1000px) translate3d(0,-4px,0) rotateX(-1deg)",
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
      const experience = section;
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

    sequenceStops.push(() => {
      clearTimeout(queueTimer);
      queueTimer = 0;
      items.forEach((el) => el.classList.add("experience-shown"));
      next = items.length;
      timeline?.style.setProperty("--journey-progress", "1");
    });
  }
  setupSequence("experience");
  setupSequence("education");

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
    const state = {
      el,
      text,
      visual,
      timer: 0,
      index: 0,
      started: false,
      deleting: false,
      looping: !!el.closest(".project-copy"),
    };
    typeStates.push(state);
    const finish = () => {
      clearTimeout(state.timer);
      visual.textContent = text;
      el.classList.remove("typing-active");
    };
    state.finish = finish;
    state.restart = () => {
      clearTimeout(state.timer);
      state.index = 0;
      state.deleting = false;
      visual.textContent = "";
      el.classList.add("typing-active");
      tick();
    };
    function tick() {
      if (!allowed()) {
        finish();
        return;
      }
      if (state.deleting) {
        const last = visual.lastChild;
        if (last?.nodeType === Node.ELEMENT_NODE) {
          last.lastChild?.remove();
          if (!last.childNodes.length) last.remove();
        } else last?.remove();
        state.index--;
        if (state.index > 0) state.timer = setTimeout(tick, 36);
        else {
          state.deleting = false;
          state.timer = setTimeout(tick, 350);
        }
        return;
      }
      const char = text[state.index++];
      if (/\s/.test(char)) visual.append(document.createTextNode(char));
      else {
        let word = visual.lastChild;
        if (!word || word.nodeType !== Node.ELEMENT_NODE) {
          word = document.createElement("span");
          word.className = "type-word";
          visual.append(word);
        }
        const letter = document.createElement("span");
        letter.className = "type-letter";
        letter.textContent = char;
        word.append(letter);
      }
      if (state.index < text.length) state.timer = setTimeout(tick, 65);
      else {
        el.classList.remove("typing-active");
        if (state.looping)
          state.timer = setTimeout(() => {
            if (!allowed() || !state.started) {
              finish();
              return;
            }
            state.deleting = true;
            el.classList.add("typing-active");
            tick();
          }, 3200);
      }
    }
    if ("IntersectionObserver" in window)
      new IntersectionObserver(
        (entries, observer) => {
          if (entries.some((e) => e.isIntersecting) && !state.started) {
            state.started = true;
            state.index = 0;
            state.deleting = false;
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
  // Body copy follows the scroll; intersection classes provide a fallback.
  const copy = [
    ...document.querySelectorAll(
      ".section p, .section h3, .section li, .hero-description",
    ),
  ].filter(
    (el) =>
      !el.closest(".project-visual, .skill-filters") &&
      !el.querySelector("[data-scroll-type]") &&
      !el.closest("li p"),
  );
  copy.forEach((el, i) => {
    el.classList.add("scroll-copy");
    el.style.setProperty("--copy-delay", (i % 4) * 45 + "ms");
  });
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ target, isIntersecting }) => {
          target.classList.toggle("copy-in-view", isIntersecting);
        });
      },
      { threshold: 0, rootMargin: "0px 0px -3% 0px" },
    );
    copy.forEach((el) => observer.observe(el));
  }

  // Reveal heading words on every viewport visit, preserving semantic text.
  document.querySelectorAll(".section h2").forEach((heading) => {
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (
        !node.parentElement.closest(
          '[data-scroll-type], [aria-hidden="true"]',
        ) &&
        node.textContent.trim()
      )
        nodes.push(node);
    }
    const words = [];
    nodes.forEach((node) => {
      const fragment = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((word) => {
        if (!word.trim()) fragment.append(document.createTextNode(word));
        else {
          const span = document.createElement("span");
          span.className = "heading-word";
          span.textContent = word;
          words.push(span);
          fragment.append(span);
        }
      });
      node.replaceWith(fragment);
    });
    if ("IntersectionObserver" in window)
      new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) {
            words.forEach((word) =>
              word.getAnimations().forEach((a) => a.cancel()),
            );
            return;
          }
          words.forEach((word, i) =>
            play(
              word,
              [
                {
                  transform:
                    "perspective(800px) translateY(28px) rotateX(-45deg)",
                  opacity: 0.25,
                },
                {
                  transform:
                    "perspective(800px) translateY(-3px) rotateX(3deg)",
                  opacity: 1,
                  offset: 0.8,
                },
                { transform: "none", opacity: 1 },
              ],
              {
                duration: 800,
                delay: i * 85,
                easing: "cubic-bezier(.16,1,.3,1)",
                fill: "backwards",
              },
            ),
          );
        },
        { threshold: 0.15 },
      ).observe(heading);
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
    copy.forEach((el) => {
      el.style.animationName = allowed() ? "" : "none";
    });
    if (allowed()) {
      typeStates.forEach((s) => {
        if (s.started && s.looping) s.restart();
      });
      return;
    }
    document.getAnimations().forEach((a) => a.cancel());
    animations.forEach((a) => a.cancel());
    sequenceStops.forEach((stopSequence) => stopSequence());
    typeStates.forEach((s) => s.finish());
  }
  new MutationObserver(stop).observe(root, {
    attributes: true,
    attributeFilter: ["class"],
  });
  document.addEventListener("visibilitychange", stop);
  stop();
})();
