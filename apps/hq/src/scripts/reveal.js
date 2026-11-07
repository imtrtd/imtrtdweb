/* Scroll reveal for [data-reveal]. Without JS (no .js on <html>) everything is simply visible.
   - blocks already on screen at load appear at once, without the rise
   - blocks that enter together are staggered in the order they appear (max ~0.35 s spread)
   - starts a little before the block reaches the viewport, so it is moving by the time you see it
   - will-change is removed after the transition (class .done) to free GPU memory */
const els = [...document.querySelectorAll("[data-reveal]")];
// .done on transitionend, with a timer as backup (no event fires if the section was skipped by content-visibility)
const settle = (el) => {
  const done = () => el.classList.add("done");
  el.addEventListener("transitionend", done, { once: true });
  setTimeout(done, 1700);
};

if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) {
  els.forEach((el) => el.classList.add("in", "done"));
} else {
  // above the fold: show now, no animation
  const vh = innerHeight;
  const rest = els.filter((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < vh * 0.92 && r.bottom > 0) {
      el.style.transition = "none";
      el.classList.add("in", "done");
      requestAnimationFrame(() => (el.style.transition = ""));
      return false;
    }
    return true;
  });
  const io = new IntersectionObserver(
    (entries) => {
      const incoming = entries.filter((e) => e.isIntersecting).map((e) => e.target);
      incoming.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top || a.getBoundingClientRect().left - b.getBoundingClientRect().left);
      requestAnimationFrame(() =>
        incoming.forEach((el, i) => {
          el.style.transitionDelay = `${Math.min(i, 5) * 70}ms`;
          settle(el);
          el.classList.add("in");
          io.unobserve(el);
        }),
      );
    },
    { rootMargin: "0px 0px 6% 0px", threshold: 0 },
  );
  rest.forEach((el) => io.observe(el));
}
