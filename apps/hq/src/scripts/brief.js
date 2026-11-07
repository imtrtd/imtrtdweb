/* Multi-step brief: step navigation + a structured message for /api/leads (sent by site-api.js). */
import "./site-api.js";

const LABELS = { timeline: "When", date: "Date", links: "Links", have: "Already have" };

function setup(form) {
  const steps = [...form.querySelectorAll("[data-step]")];
  const bars = [...form.querySelectorAll("[data-progress]")];
  const back = form.querySelector("[data-brief-back]");
  const next = form.querySelector("[data-brief-next]");
  const send = form.querySelector("[data-brief-send]");
  const count = form.querySelector("[data-brief-count]");
  let at = 0;

  // ?type=Website preselects step 1 (links from the packages)
  const want = new URLSearchParams(location.search).get("type");
  if (want) {
    const r = [...form.elements.task].find((x) => x.value.toLowerCase() === want.toLowerCase());
    if (r) r.checked = true;
  }

  function show(i, focus) {
    at = Math.max(0, Math.min(steps.length - 1, i));
    steps.forEach((s, k) => s.toggleAttribute("data-active", k === at));
    bars.forEach((b, k) => {
      b.classList.toggle("is-on", k === at);
      b.classList.toggle("is-done", k < at);
    });
    back.hidden = at === 0;
    next.hidden = at === steps.length - 1;
    send.hidden = at !== steps.length - 1;
    count.textContent = `Step ${at + 1} of ${steps.length}`;
    if (focus) {
      const first = steps[at].querySelector("input:checked, input, textarea");
      (first || steps[at]).focus({ preventScroll: true });
      const top = form.getBoundingClientRect().top;
      if (top < 0 || top > innerHeight * 0.6) form.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }

  next.addEventListener("click", () => {
    if (at === 0 && !form.elements.task.value) {
      // a type is the one thing worth asking first; "Not sure yet" is fine
      const ns = [...form.elements.task].find((x) => x.value === "Not sure yet");
      if (ns) ns.checked = true;
    }
    show(at + 1, true);
  });
  back.addEventListener("click", () => show(at - 1, true));
  // Enter in a text input moves forward instead of submitting early
  form.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.matches("input[type=text], input:not([type])") && at < steps.length - 1) {
      e.preventDefault();
      next.click();
    }
  });
  // choosing a type advances automatically
  steps[0].addEventListener("change", () => setTimeout(() => at === 0 && show(1, true), 180));

  function prefix() {
    const v = (n) => {
      const el = form.elements[n];
      if (!el) return "";
      if (el instanceof RadioNodeList || el.length) {
        return [...el].filter((x) => x.checked).map((x) => x.value).join(", ") || (el.value ?? "");
      }
      return String(el.value || "").trim();
    };
    return Object.entries(LABELS)
      .map(([n, label]) => [label, v(n)])
      .filter(([, val]) => val)
      .map(([label, val]) => `${label}: ${val}`)
      .join("\n");
  }

  form.setAttribute("data-ready", "");
  show(0, false);

  const wire = () =>
    window.IMTRTD.wire(form, {
      label: form.getAttribute("data-brief-label") || "Brief",
      prefix,
      done() {
        form.setAttribute("data-sent", "");
        const d = form.querySelector("[data-brief-done]");
        d.focus();
      },
    });
  if (window.IMTRTD) wire();
  else addEventListener("DOMContentLoaded", wire, { once: true });

  // wire() validates name/contact; if they are missing, jump to the contact step
  form.addEventListener("submit", () => {
    if (!form.elements.name.value.trim() || !form.elements.contact.value.trim()) show(steps.length - 1, true);
  });
}

document.querySelectorAll('form[data-brief="steps"]').forEach(setup);
