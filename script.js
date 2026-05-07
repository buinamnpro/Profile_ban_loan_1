const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function setupDragCarousel(options) {
  const {
    container,
    track,
    getCurrent,
    setCurrent,
    getMaxIndex,
    getSlideWidth,
    paint,
    onDragStart,
    onDragEnd
  } = options;

  if (!container || !track) return;

  let isDragging = false;
  let startX = 0;
  let startTranslate = 0;
  let moved = 0;

  const getTranslateForIndex = (index) => -index * getSlideWidth();

  container.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    isDragging = true;
    moved = 0;
    startX = event.clientX;
    startTranslate = getTranslateForIndex(getCurrent());
    container.classList.add("is-dragging");
    track.style.transition = "none";
    onDragStart?.();
    container.setPointerCapture?.(event.pointerId);
  });

  container.addEventListener("pointermove", (event) => {
    if (!isDragging) return;
    const delta = event.clientX - startX;
    moved = Math.max(moved, Math.abs(delta));

    const minTranslate = -getMaxIndex() * getSlideWidth();
    const nextTranslate = Math.max(minTranslate, Math.min(0, startTranslate + delta));
    track.style.transform = `translate3d(${nextTranslate}px, 0, 0)`;
  });

  const finishDrag = (event) => {
    if (!isDragging) return;
    isDragging = false;
    container.classList.remove("is-dragging");
    track.style.transition = "";

    const delta = event.clientX - startX;
    const threshold = getSlideWidth() * 0.18;
    let next = getCurrent();
    if (delta <= -threshold) next += 1;
    if (delta >= threshold) next -= 1;
    setCurrent(Math.max(0, Math.min(next, getMaxIndex())));
    paint();
    onDragEnd?.();
  };

  container.addEventListener("pointerup", finishDrag);
  container.addEventListener("pointercancel", finishDrag);
  container.addEventListener("pointerleave", (event) => {
    if (!isDragging) return;
    finishDrag(event);
  });

  container.addEventListener("click", (event) => {
    if (moved > 8) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

function setupRevealOnScroll() {
  const revealTargets = [
    ...document.querySelectorAll(".section h2, .section .lead, .feature, .service, .product, .price-card, .member, blockquote, .faq-list details, .mini-grid article, .card, .stats div")
  ];

  revealTargets.forEach((el, index) => {
    el.classList.add("reveal");
    el.classList.add(`reveal-delay-${index % 4}`);
  });

  if (prefersReducedMotion) {
    revealTargets.forEach((el) => el.classList.add("show"));
    return;
  }

  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("show");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.14, rootMargin: "0px 0px -30px 0px" }
  );

  revealTargets.forEach((el) => revealObserver.observe(el));
}

function setupStatsCounter() {
  const statsContainer = document.querySelector(".stats-showcase") || document.querySelector(".stats");
  const statElements = document.querySelectorAll(".stat-number");
  if (!statsContainer || !statElements.length) return;

  const animateCounter = (el) => {
    const target = Number(el.dataset.target || "0");
    const suffix = el.dataset.suffix || "";
    const duration = 1350;
    const startAt = performance.now();

    const tick = (time) => {
      const progress = Math.min((time - startAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(target * eased);
      el.textContent = `${value}${suffix}`;
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  };

  if (prefersReducedMotion) {
    statElements.forEach((el) => {
      el.textContent = `${el.dataset.target || 0}${el.dataset.suffix || ""}`;
    });
    return;
  }

  const statObserver = new IntersectionObserver(
    (entries, observer) => {
      const [entry] = entries;
      if (!entry.isIntersecting) return;
      statElements.forEach(animateCounter);
      observer.unobserve(entry.target);
    },
    { threshold: 0.35 }
  );

  statObserver.observe(statsContainer);
}

function setupParallaxCards() {
  const hero = document.querySelector(".hero");
  const cards = document.querySelectorAll(".hero .card, .section .card");
  if (!hero || !cards.length || prefersReducedMotion) return;

  window.addEventListener(
    "scroll",
    () => {
      const shift = Math.min(window.scrollY * 0.08, 22);
      cards.forEach((card, index) => {
        const direction = index % 2 === 0 ? 1 : -1;
        card.style.transform = `translate3d(${direction * shift * 0.35}px, ${shift}px, 0)`;
      });
    },
    { passive: true }
  );
}

function setupSideScrollSections() {
  const scene = document.querySelector(".side-scroll-scene");
  const track = scene?.querySelector(".side-scroll-track");
  const dots = Array.from(scene?.querySelectorAll(".hero-indicators .dot") || []);
  if (!scene || !track) return;

  if (window.innerWidth <= 980) {
    track.style.transform = "translate3d(0, 0, 0)";
    return;
  }

  let current = 0;
  let timer;

  const paint = () => {
    const slideWidth = scene.getBoundingClientRect().width;
    track.style.transform = `translate3d(${-current * slideWidth}px, 0, 0)`;
    dots.forEach((dot, index) => {
      dot.classList.toggle("active", index === current);
    });
  };

  const go = (index) => {
    current = Math.max(0, Math.min(index, 1));
    paint();
  };

  const autoPlay = () => {
    clearInterval(timer);
    if (prefersReducedMotion) return;
    timer = setInterval(() => {
      current = current === 0 ? 1 : 0;
      paint();
    }, 3000);
  };

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      go(index);
      autoPlay();
    });
  });

  scene.addEventListener("mouseenter", () => clearInterval(timer));
  scene.addEventListener("mouseleave", autoPlay);
  window.addEventListener("resize", paint);

  setupDragCarousel({
    container: scene,
    track,
    getCurrent: () => current,
    setCurrent: (value) => {
      current = value;
    },
    getMaxIndex: () => 1,
    getSlideWidth: () => scene.getBoundingClientRect().width,
    paint,
    onDragStart: () => clearInterval(timer),
    onDragEnd: autoPlay
  });

  paint();
  autoPlay();
}

function setupButtonPulse() {
  const buttons = document.querySelectorAll(".btn");
  buttons.forEach((btn) => {
    btn.addEventListener("mouseenter", () => {
      btn.classList.remove("pulse");
      requestAnimationFrame(() => btn.classList.add("pulse"));
    });
    btn.addEventListener("animationend", () => {
      btn.classList.remove("pulse");
    });
  });
}

function setupScrollTopButton() {
  const buttons = document.querySelectorAll(".scroll-top-btn");
  if (!buttons.length) return;
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

function setupQbCarousel() {
  const carousel = document.querySelector(".qb_pro_general");
  if (!carousel) return;

  const track = carousel.querySelector(".qb_pro_track");
  const slides = Array.from(carousel.querySelectorAll(".qb_pro_detailds"));
  const dots = Array.from(carousel.querySelectorAll(".slick-dots button"));
  if (!track || !slides.length || !dots.length) return;

  const perView = () => (window.innerWidth <= 980 ? 1 : 2);
  const maxIndex = () => Math.max(0, slides.length - perView());

  let current = 0;
  let timer;

  const paint = () => {
    const width = slides[0].getBoundingClientRect().width;
    track.style.transform = `translate3d(${-current * width}px, 0, 0)`;
    dots.forEach((dot, idx) => {
      const active = idx === current;
      dot.parentElement?.classList.toggle("slick-active", active);
      dot.setAttribute("aria-selected", active ? "true" : "false");
    });
  };

  const go = (index) => {
    const limit = maxIndex();
    current = Math.max(0, Math.min(index, limit));
    paint();
  };

  const autoPlay = () => {
    clearInterval(timer);
    if (prefersReducedMotion) return;
    timer = setInterval(() => {
      const limit = maxIndex();
      current = current >= limit ? 0 : current + 1;
      paint();
    }, 2600);
  };

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      go(index);
      autoPlay();
    });
  });

  carousel.addEventListener("mouseenter", () => clearInterval(timer));
  carousel.addEventListener("mouseleave", autoPlay);
  window.addEventListener("resize", () => go(Math.min(current, maxIndex())));

  setupDragCarousel({
    container: carousel,
    track,
    getCurrent: () => current,
    setCurrent: (value) => {
      current = value;
    },
    getMaxIndex: maxIndex,
    getSlideWidth: () => slides[0].getBoundingClientRect().width,
    paint,
    onDragStart: () => clearInterval(timer),
    onDragEnd: autoPlay
  });

  paint();
  autoPlay();
}

function setupPricingCarousel() {
  const carousel = document.querySelector(".pricing-carousel");
  if (!carousel || window.innerWidth <= 980) return;

  const track = carousel.querySelector(".pricing-track");
  const dots = Array.from(carousel.querySelectorAll(".pricing-dots button"));
  if (!track || !dots.length) return;

  let current = 0;
  let timer;
  const maxIndex = dots.length - 1;

  const paint = () => {
    const width = carousel.querySelector(".pricing-viewport")?.getBoundingClientRect().width || 0;
    track.style.transform = `translate3d(${-current * width}px, 0, 0)`;
    dots.forEach((dot, idx) => {
      const active = idx === current;
      dot.parentElement?.classList.toggle("slick-active", active);
      dot.setAttribute("aria-selected", active ? "true" : "false");
    });
  };

  const go = (index) => {
    current = Math.max(0, Math.min(index, maxIndex));
    paint();
  };

  const autoPlay = () => {
    clearInterval(timer);
    if (prefersReducedMotion) return;
    timer = setInterval(() => {
      current = current >= maxIndex ? 0 : current + 1;
      paint();
    }, 3200);
  };

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      go(index);
      autoPlay();
    });
  });

  carousel.addEventListener("mouseenter", () => clearInterval(timer));
  carousel.addEventListener("mouseleave", autoPlay);
  window.addEventListener("resize", paint);

  setupDragCarousel({
    container: carousel,
    track,
    getCurrent: () => current,
    setCurrent: (value) => {
      current = value;
    },
    getMaxIndex: () => maxIndex,
    getSlideWidth: () => carousel.querySelector(".pricing-viewport")?.getBoundingClientRect().width || 1,
    paint,
    onDragStart: () => clearInterval(timer),
    onDragEnd: autoPlay
  });

  paint();
  autoPlay();
}

document.addEventListener("DOMContentLoaded", () => {
  setupSideScrollSections();
  setupRevealOnScroll();
  setupStatsCounter();
  setupParallaxCards();
  setupButtonPulse();
  setupQbCarousel();
  setupPricingCarousel();
  setupScrollTopButton();
});
