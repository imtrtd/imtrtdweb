/* Fade-up for [data-reveal] blocks. Without JS (no .js on <html>) everything is visible. */
const els = document.querySelectorAll("[data-reveal]");
if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) {
  els.forEach((el) => el.classList.add("in"));
} else {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const d = Number(el.getAttribute("data-reveal")) || 0;
        if (d) el.style.transitionDelay = `${d * 70}ms`;
        el.classList.add("in");
        io.unobserve(el);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
  );
  els.forEach((el) => io.observe(el));
}
