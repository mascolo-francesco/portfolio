const DEFAULT_SPEED = 60;
const DEFAULT_DELAY = 450;

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
}
