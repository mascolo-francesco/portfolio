// Slightly faster typing + line delay
const DEFAULT_SPEED = 45;
const DEFAULT_DELAY = 320;

const typewriterBlocks = Array.from(
  document.querySelectorAll(".typewriter-block")
);

const typewriterInstances = new Map();

typewriterBlocks.forEach((block) => {
  const textEl = block.querySelector(".typewriter");
  const cursor = block.querySelector(".cursor");
  if (!textEl || !cursor) return;

  let lines;
  try {
    lines = JSON.parse(textEl.dataset.lines || "[]");
  } catch (error) {
    lines = [];
  }

  // Replace dynamic placeholders with real runtime values
  const formatLastLogin = () => {
    const now = new Date();
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const pad = (n) => String(n).padStart(2, "0");
    const day = days[now.getDay()];
    const mon = months[now.getMonth()];
    const date = pad(now.getDate());
    const hh = pad(now.getHours());
    const mm = pad(now.getMinutes());
    const ss = pad(now.getSeconds());
    return `Last login: ${day} ${mon} ${date} ${hh}:${mm}:${ss} on console`;
  };

  if (Array.isArray(lines) && lines.length > 0) {
    if (typeof lines[0] === "string" && /LAST_LOGIN|__LAST_LOGIN__/i.test(lines[0])) {
      lines[0] = formatLastLogin();
    }
  }

  const instance = {
    block,
    textEl,
    cursor,
    lines,
    lineIndex: 0,
    charIndex: 0,
    started: false,
    completed: false,
    speed: Number(block.dataset.speed) || DEFAULT_SPEED,
    delay: Number(block.dataset.delay) || DEFAULT_DELAY,
  };

  cursor.style.visibility = block.dataset.autostart === "true" ? "visible" : "hidden";
  typewriterInstances.set(block, instance);

  // For the about terminal, pre-measure the final height so the
  // window doesn't grow while typing on larger screens. On very
  // small viewports we allow it to expand naturally to avoid
  // clipping the final lines.
  if (block.classList.contains("about-terminal") && Array.isArray(lines)) {
    let measuring = false;
    const measure = () => {
      if (measuring) return;
      measuring = true;

      const bodyEl = block.closest(".terminal-window__body");

      block.style.removeProperty("height");
      block.style.removeProperty("min-height");
      block.style.removeProperty("max-height");
      block.style.removeProperty("flex-shrink");
      if (bodyEl) {
        bodyEl.style.removeProperty("min-height");
      }

      const shouldLockHeight = window.innerWidth > 560;

      if (!shouldLockHeight) {
        measuring = false;
        return;
      }

      const ghost = document.createElement("span");
      ghost.className = "typewriter";
      ghost.style.cssText =
        "position:absolute;visibility:hidden;pointer-events:none;white-space:pre-wrap;width:100%;left:0;right:0;";
      ghost.textContent = lines.join("\n");
      block.appendChild(ghost);

      const height = ghost.offsetHeight;
      ghost.remove();

      if (height > 0) {
        const docClientHeight =
          document.documentElement && document.documentElement.clientHeight
            ? document.documentElement.clientHeight
            : 0;
        const viewportHeight = Math.max(window.innerHeight || 0, docClientHeight);
        const isNarrowWidth = window.innerWidth <= 720;
        const extraSpace = isNarrowWidth
          ? Math.max(180, Math.min(320, Math.round(viewportHeight * 0.28)))
          : 64;
        const roundedHeight = Math.ceil(height + extraSpace);
        block.style.height = `${roundedHeight}px`;
        block.style.minHeight = `${roundedHeight}px`;
        block.style.maxHeight = `${roundedHeight}px`;
        block.style.flexShrink = "0";

        if (bodyEl) {
          const styles = window.getComputedStyle(bodyEl);
          const padTop = parseFloat(styles.paddingTop) || 0;
          const padBottom = parseFloat(styles.paddingBottom) || 0;
          bodyEl.style.minHeight = `${roundedHeight + padTop + padBottom}px`;
        }
      }

      measuring = false;
    };

    // Run after fonts are ready for accurate metrics
    if (document.fonts && typeof document.fonts.ready?.then === "function") {
      document.fonts.ready.then(() => measure());
    }
    // Fallbacks: next frame and on load
    requestAnimationFrame(measure);
    window.addEventListener("load", measure, { once: true });

    // Re-measure if container width changes
    if (typeof ResizeObserver === "function") {
      const ro = new ResizeObserver(() => measure());
      ro.observe(block);
      // Store observer for possible future use
      instance.resizeObserver = ro;
    }

    const handleResize = () => measure();
    window.addEventListener("resize", handleResize, { passive: true });
    instance.resizeListener = handleResize;

    instance.measure = measure;
  }
});

function renderTypewriter(instance) {
  const { textEl, cursor, lines } = instance;
  const safeLineIndex = Math.min(instance.lineIndex, lines.length);
  const completed = lines.slice(0, safeLineIndex);
  let active = "";

  if (instance.lineIndex < lines.length) {
    active = lines[instance.lineIndex].slice(0, instance.charIndex);
  }

  const outputLines = [...completed];
  if (instance.lineIndex < lines.length) {
    outputLines.push(active);
  }

  if (outputLines.length === 0) {
    outputLines.push("");
  }

  textEl.textContent = outputLines.join("\n");
  textEl.appendChild(cursor);
}

function finishTypewriter(instance) {
  instance.completed = true;
  instance.lineIndex = instance.lines.length;
  instance.charIndex = 0;
  renderTypewriter(instance);
}

function stepTypewriter(instance) {
  if (!instance || instance.completed) {
    return;
  }

  if (instance.lineIndex >= instance.lines.length) {
    finishTypewriter(instance);
    return;
  }

  const currentLine = instance.lines[instance.lineIndex] ?? "";

  if (instance.charIndex <= currentLine.length) {
    renderTypewriter(instance);
    instance.charIndex += 1;
    instance.timer = window.setTimeout(() => stepTypewriter(instance), instance.speed);
  } else {
    instance.lineIndex += 1;
    instance.charIndex = 0;
    instance.timer = window.setTimeout(() => stepTypewriter(instance), instance.delay);
  }
}

function startTypewriter(instance) {
  if (!instance || instance.started) {
    return;
  }

  instance.started = true;
  instance.cursor.style.visibility = "visible";
  stepTypewriter(instance);
}

const typewriterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      const instance = typewriterInstances.get(entry.target);
      if (instance) {
        startTypewriter(instance);
        typewriterObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.35 }
);

typewriterInstances.forEach((instance, block) => {
  if (block.dataset.autostart === "true") {
    startTypewriter(instance);
  } else {
    typewriterObserver.observe(block);
  }
});

const revealEls = document.querySelectorAll(".reveal");
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

revealEls.forEach((el) => observer.observe(el));

document.getElementById("year").textContent = new Date().getFullYear();

const siteHeader = document.querySelector(".site-header");
if (siteHeader) {
  const updateHeaderOffset = () => {
    const { height } = siteHeader.getBoundingClientRect();
    document.documentElement.style.setProperty(
      "--header-offset",
      `${Math.ceil(height)}px`
    );
  };

  updateHeaderOffset();

  if (typeof ResizeObserver === "function") {
    const headerResizeObserver = new ResizeObserver(updateHeaderOffset);
    headerResizeObserver.observe(siteHeader);
  }
  window.addEventListener("resize", updateHeaderOffset, { passive: true });
  window.addEventListener("load", updateHeaderOffset, { once: true });

  // Keep header in compact mode at all times
  siteHeader.classList.add("is-condensed");
  updateHeaderOffset();
}

// Modal logic for case studies
document.addEventListener("DOMContentLoaded", function () {
  const modal = document.getElementById("case-modal");
  if (!modal) return;
  const overlay = modal.querySelector(".modal__overlay");
  const body = modal.querySelector(".modal__body");
  const titleEl = modal.querySelector(".modal__title");
  const closeButtons = modal.querySelectorAll("[data-modal-dismiss]");

  let lastFocused = null;
  let activeItem = null;

  function openModal({ title, contentEl, sourceItem }) {
    lastFocused = document.activeElement;
    titleEl.textContent = title || "Case study";
    body.innerHTML = "";
    if (contentEl) {
      const bodyEl = contentEl.querySelector('.timeline__details-body');
      const toClone = bodyEl || contentEl;
      const clone = toClone.cloneNode(true);
      clone.style.display = "block";
      body.appendChild(clone);
    }
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    if (sourceItem) {
      sourceItem.classList.add("is-active");
      activeItem = sourceItem;
    }
    // Focus heading for a11y
    setTimeout(() => {
      titleEl.focus?.();
    }, 0);
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.removeProperty("overflow");
    if (activeItem) {
      activeItem.classList.remove("is-active");
      activeItem = null;
    }
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus();
    }
  }

  // Wire up open buttons
  const caseButtons = document.querySelectorAll("[data-case-toggle]");
  caseButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-case-toggle");
      const details = document.getElementById(`case-${key}`);
      const item = btn.closest(".timeline__item");
      if (!details || !item) return;

      const title = item.querySelector(".timeline__title")?.textContent?.trim();
      openModal({ title, contentEl: details, sourceItem: item });
    });
  });

  // Close handlers
  closeButtons.forEach((cb) => cb.addEventListener("click", closeModal));
  overlay?.addEventListener("click", closeModal);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) {
      closeModal();
    }
  });
});
