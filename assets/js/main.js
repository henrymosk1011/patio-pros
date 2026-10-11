/*
 * ProGas Propane: interactions and scroll animations.
 * Performance notes:
 *  - Reveals use IntersectionObserver (no work on scroll).
 *  - The only scroll listener is passive, rAF-throttled, and only toggles
 *    classes / writes transforms. Native scrolling is never hijacked.
 *  - Parallax, the hero exit and the progress bar run as CSS scroll-driven
 *    animations where supported; the JS fallback below covers other browsers.
 * Accessibility notes:
 *  - Animated text (split headings, counters) keeps a static copy for screen readers.
 *  - Looping animation can be paused (WCAG 2.2.2) and respects reduced-motion settings.
 *  - The mobile menu and photo viewer manage focus and keep the page behind them inert.
 */
(() => {
  "use strict";

  const root = document.documentElement;
  const cfg = window.SITE_CONFIG || {};
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const supportsScrollTimeline =
    !!(window.CSS && CSS.supports && CSS.supports("animation-timeline: view()"));

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  $$("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });

  // Links that open a new tab say so to screen-reader users.
  $$('a[target="_blank"]').forEach((a) => {
    if (!a.querySelector(".sr-only")) a.insertAdjacentHTML("beforeend", '<span class="sr-only"> (opens in a new tab)</span>');
  });

  /* ---------- Split headings into words ---------- */
  function splitWords(el) {
    const label = el.textContent.replace(/\s+/g, " ").trim();
    let index = 0;

    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(" "));
              return;
            }
            const outer = document.createElement("span");
            const inner = document.createElement("span");
            outer.className = "w";
            inner.className = "w__i";
            inner.style.setProperty("--wi", index++);
            inner.textContent = part;
            outer.appendChild(inner);
            frag.appendChild(outer);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
        }
      });
    };

    const visual = document.createElement("span");
    visual.setAttribute("aria-hidden", "true");
    while (el.firstChild) visual.appendChild(el.firstChild);
    walk(visual);

    const sr = document.createElement("span");
    sr.className = "sr-only";
    sr.textContent = label;
    el.append(sr, visual);
  }

  $$("[data-split]").forEach(splitWords);

  /* ---------- Scroll reveal ---------- */
  // Elements that enter together are staggered by their order in that batch,
  // so a lone element never waits on a long delay meant for a whole grid.
  const msVar = (el, name) => parseFloat(el.style.getPropertyValue(name)) || 0;

  const revealObserver = new IntersectionObserver((entries) => {
    let batch = 0;
    entries
      .filter((entry) => entry.isIntersecting)
      .forEach((entry) => {
        const el = entry.target;
        revealObserver.unobserve(el);
        if (el.hasAttribute("data-reveal")) el.style.setProperty("--i", batch++);
        el.classList.add("is-in");
        const settle = msVar(el, "--i") * 90 + msVar(el, "--d") + 1300;
        setTimeout(() => el.classList.add("is-done"), settle);
      });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.01 });

  const observeReveal = (el) => {
    if (reduceMotion) {
      el.classList.add("is-in", "is-done");
      return;
    }
    revealObserver.observe(el);
  };

  $$("[data-reveal], [data-split]").forEach(observeReveal);

  // Keyboard users tabbing to content that hasn't animated in yet see it immediately.
  document.addEventListener("focusin", (e) => {
    const hidden = e.target.closest && e.target.closest("[data-reveal]:not(.is-in)");
    if (hidden) {
      revealObserver.unobserve(hidden);
      hidden.classList.add("is-in", "is-done");
    }
  });

  // Lets reviews.js animate cards it adds later.
  window.siteUI = { observeReveal };

  /* ---------- Count-up numbers ---------- */
  const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

  function targetFor(el) {
    if (el.dataset.countSince) return new Date().getFullYear() - Number(el.dataset.countSince);
    return Number(el.dataset.count);
  }

  const formatCount = (el, n) => `${el.dataset.prefix || ""}${n}${el.dataset.suffix || ""}`;

  const counters = $$("[data-count], [data-count-since]");
  counters.forEach((el) => {
    // Screen readers get the final number once; the animated digits are hidden from them.
    const sr = document.createElement("span");
    sr.className = "sr-only";
    sr.textContent = formatCount(el, targetFor(el));
    el.after(sr);
    el.setAttribute("aria-hidden", "true");
    el.textContent = formatCount(el, reduceMotion ? targetFor(el) : 0);
  });

  const countObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      countObserver.unobserve(el);
      const target = targetFor(el);
      const duration = 1700;
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        el.textContent = formatCount(el, Math.round(target * easeOutExpo(t)));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });

  if (!reduceMotion) counters.forEach((el) => countObserver.observe(el));

  /* ---------- Pause off-screen loops ---------- */
  const loopObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.target.classList.toggle("is-offscreen", !entry.isIntersecting));
  });
  $$("[data-hero], [data-marquee]").forEach((el) => loopObserver.observe(el));

  /* ---------- Pause / play animations (WCAG 2.2.2) ---------- */
  const motionToggle = $("[data-motion-toggle]");
  if (motionToggle) {
    const sync = () => motionToggle.setAttribute("aria-pressed", String(root.classList.contains("motion-paused")));
    sync();
    motionToggle.addEventListener("click", () => {
      const paused = root.classList.toggle("motion-paused");
      try { localStorage.setItem("progas-motion", paused ? "paused" : "playing"); } catch (e) { /* storage unavailable */ }
      sync();
    });
  }

  /* ---------- Header, progress, action bar (+ parallax fallback) ---------- */
  const header = $("[data-header]");
  const hero = $("[data-hero]");
  const actionBar = $("[data-action-bar]");
  const progressBar = $(".scroll-progress span");
  const heroMedia = $(".hero__media");
  const heroContent = $(".hero__content");

  let menuOpen = false;
  let lastY = window.scrollY;
  let heroHeight = hero ? hero.offsetHeight : 600;
  let maxScroll = 1;
  let ticking = false;

  const measure = () => {
    heroHeight = hero ? hero.offsetHeight : 600;
    maxScroll = Math.max(1, root.scrollHeight - window.innerHeight);
  };

  // JS parallax is only used where CSS scroll timelines are unsupported.
  const parallaxItems = [];
  if (!supportsScrollTimeline && !reduceMotion && window.matchMedia("(min-width: 961px)").matches) {
    const pxObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const item = parallaxItems.find((it) => it.box === entry.target);
        if (item) item.active = entry.isIntersecting;
      });
      requestUpdate();
    }, { rootMargin: "120px 0px" });

    $$(".parallax > img").forEach((img) => {
      const box = img.parentElement;
      const styles = getComputedStyle(box);
      parallaxItems.push({
        img,
        box,
        shift: parseFloat(styles.getPropertyValue("--px-shift")) || 7,
        active: true, // position everything once on load; the observer narrows this down
        top: 0,
        height: 0,
      });
      pxObserver.observe(box);
    });
  }

  function update() {
    ticking = false;
    const y = window.scrollY;

    header.classList.toggle("is-scrolled", y > 24);
    if (Math.abs(y - lastY) > 6) {
      const headerHasFocus = header.contains(document.activeElement);
      header.classList.toggle("is-hidden", !menuOpen && !headerHasFocus && y > lastY && y > heroHeight * 0.6);
      lastY = y;
    }
    if (actionBar) actionBar.classList.toggle("is-visible", y > heroHeight * 0.65);

    if (supportsScrollTimeline || reduceMotion) return;

    progressBar.style.setProperty("--progress", Math.min(1, y / maxScroll).toFixed(4));

    if (y < heroHeight) {
      const p = y / heroHeight;
      const q = Math.min(1, p / 0.7);
      heroMedia.style.transform = `translate3d(0, ${(p * 22).toFixed(2)}%, 0)`;
      heroContent.style.transform = `translate3d(0, ${(-q * 10).toFixed(2)}vh, 0)`;
      heroContent.style.opacity = (1 - q).toFixed(3);
    }

    // Read every rect first, then write every transform: no layout thrash.
    const vh = window.innerHeight;
    const active = parallaxItems.filter((it) => it.active);
    active.forEach((it) => {
      const r = it.box.getBoundingClientRect();
      it.top = r.top;
      it.height = r.height;
    });
    active.forEach((it) => {
      const p = (vh - it.top) / (vh + it.height);
      const shift = (Math.min(1, Math.max(0, p)) * 2 - 1) * it.shift;
      it.img.style.transform = `translate3d(0, ${shift.toFixed(2)}%, 0)`;
    });
  }

  function requestUpdate() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  // Keyboard users tabbing into a hidden header should always see it.
  header.addEventListener("focusin", () => header.classList.remove("is-hidden"));

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", () => { measure(); requestUpdate(); }, { passive: true });
  window.addEventListener("load", () => { measure(); requestUpdate(); });
  measure();
  update();

  /* ---------- How it works: scroll-linked steps ----------
     A spark runs along the line as you scroll, and each step lights up when
     the spark reaches its number. On wide screens the stage is pinned (CSS
     position: sticky) for the length of .process__pin. Only --fill and a few
     classes are written, and only while the section is near the viewport. */
  const processPin = $("[data-process]");
  if (processPin && !reduceMotion) {
    const section = processPin.closest(".process");
    const track = $(".process__track", processPin);
    const line = $(".process__line", processPin);
    const steps = $$(".step", processPin);
    const nums = steps.map((step) => $(".step__num", step));
    const pinned = window.matchMedia("(min-width: 961px) and (min-height: 700px)");
    let marks = [];
    let near = false;
    let frame = 0;
    let lastLit = null;

    section.classList.add("is-live");

    // Where each number sits along the line, from 0 (start) to 1 (end).
    const measureSteps = () => {
      track.style.removeProperty("--line-end");
      let box = line.getBoundingClientRect();
      const vertical = box.height > box.width;
      if (vertical) {
        // Stop the vertical line at the last number instead of the end of the list.
        const last = nums[nums.length - 1].getBoundingClientRect();
        const end = track.getBoundingClientRect().bottom - (last.top + last.height / 2);
        track.style.setProperty("--line-end", `${Math.max(0, end).toFixed(1)}px`);
        box = line.getBoundingClientRect();
      }
      marks = nums.map((num) => {
        const r = num.getBoundingClientRect();
        return vertical
          ? (r.top + r.height / 2 - box.top) / box.height
          : (r.left + r.width / 2 - box.left) / box.width;
      });
    };

    const renderSteps = () => {
      frame = 0;
      const vh = window.innerHeight;
      let fill;
      if (pinned.matches) {
        const r = processPin.getBoundingClientRect();
        const progress = -r.top / Math.max(1, r.height - vh);
        fill = (progress - 0.04) / 0.8; // a short pause before step 1 and after step 4
      } else {
        const r = line.getBoundingClientRect();
        fill = (vh * 0.62 - r.top) / Math.max(1, r.height);
      }
      const clamped = Math.min(1, Math.max(0, fill));
      track.style.setProperty("--fill", clamped.toFixed(4));
      track.classList.toggle("is-running", clamped > 0 && clamped < 1);

      let lit = -1;
      marks.forEach((mark, i) => { if (fill >= mark - 0.002) lit = i; });
      if (lit === lastLit) return;
      lastLit = lit;
      steps.forEach((step, i) => {
        step.classList.toggle("is-lit", i <= lit);
        step.classList.toggle("is-current", i === lit);
      });
    };

    const requestSteps = () => {
      if (near && !frame) frame = requestAnimationFrame(renderSteps);
    };

    new IntersectionObserver((entries) => {
      near = entries[0].isIntersecting;
      requestSteps();
    }, { rootMargin: "300px 0px" }).observe(processPin);

    const remeasure = () => { measureSteps(); requestSteps(); };
    window.addEventListener("scroll", requestSteps, { passive: true });
    window.addEventListener("resize", remeasure, { passive: true });
    window.addEventListener("load", remeasure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
    measureSteps();
    renderSteps();
  }

  /* ---------- Active nav link ---------- */
  const navLinks = $$(".nav a");
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      navLinks.forEach((a) => {
        const current = a.getAttribute("href") === `#${id}`;
        a.classList.toggle("is-active", current);
        if (current) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  navLinks
    .map((a) => document.getElementById(a.getAttribute("href").slice(1)))
    .filter(Boolean)
    .forEach((section) => sectionObserver.observe(section));

  /* ---------- Mobile menu ---------- */
  const toggle = $(".menu-toggle");
  const menu = $("#mobile-menu");
  const menuLabel = $("[data-menu-label]");
  // Everything outside the header and the menu becomes inert while the menu is open.
  const behindMenu = [$("#main"), $(".site-footer"), actionBar, $(".skip-link")].filter(Boolean);

  function setMenu(open, { returnFocus = true } = {}) {
    if (open === menuOpen) return;
    menuOpen = open;
    toggle.setAttribute("aria-expanded", String(open));
    menuLabel.textContent = open ? "Close menu" : "Open menu";
    behindMenu.forEach((el) => { el.inert = open; });

    if (open) {
      header.classList.remove("is-hidden");
      menu.hidden = false;
      requestAnimationFrame(() => {
        root.classList.add("menu-open");
        const first = $("a", menu);
        if (first) first.focus({ preventScroll: true });
      });
    } else {
      root.classList.remove("menu-open");
      setTimeout(() => { if (!menuOpen) menu.hidden = true; }, reduceMotion ? 0 : 400);
      if (returnFocus) toggle.focus({ preventScroll: true });
    }
  }

  if (toggle && menu) {
    toggle.addEventListener("click", () => setMenu(!menuOpen));
    menu.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false, { returnFocus: false }); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menuOpen) setMenu(false);
    });
    window.matchMedia("(min-width: 1181px)").addEventListener("change", (e) => {
      if (e.matches) setMenu(false, { returnFocus: false });
    });
  }

  /* ---------- Pointer effects (desktop only) ---------- */
  if (finePointer && !reduceMotion) {
    $$("[data-magnetic]").forEach((btn) => {
      let rect = null;
      let frame = 0;
      btn.addEventListener("pointerenter", () => { rect = btn.getBoundingClientRect(); });
      btn.addEventListener("pointermove", (e) => {
        if (!rect) rect = btn.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2) * 0.22;
        const y = (e.clientY - rect.top - rect.height / 2) * 0.32;
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          btn.style.setProperty("--tx", `${x.toFixed(1)}px`);
          btn.style.setProperty("--ty", `${y.toFixed(1)}px`);
        });
      });
      btn.addEventListener("pointerleave", () => {
        cancelAnimationFrame(frame);
        rect = null;
        btn.style.setProperty("--tx", "0px");
        btn.style.setProperty("--ty", "0px");
      });
    });

    document.addEventListener("pointermove", (e) => {
      const card = e.target.closest && e.target.closest("[data-spotlight]");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${(e.clientX - r.left).toFixed(0)}px`);
      card.style.setProperty("--my", `${(e.clientY - r.top).toFixed(0)}px`);
    }, { passive: true });
  }

  /* ---------- FAQ accordion ---------- */
  $$("[data-accordion]").forEach((accordion) => {
    accordion.addEventListener("click", (e) => {
      const btn = e.target.closest("button[aria-controls]");
      if (!btn) return;
      const item = btn.closest(".accordion__item");
      const open = btn.getAttribute("aria-expanded") !== "true";
      $$(".accordion__item.is-open", accordion).forEach((other) => {
        if (other === item) return;
        other.classList.remove("is-open");
        $("button[aria-controls]", other).setAttribute("aria-expanded", "false");
      });
      item.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
    });
  });

  /* ---------- Photo viewer ---------- */
  const lightbox = $("[data-lightbox]");
  const openers = $$("[data-gallery] .work__open");
  if (lightbox && openers.length && typeof lightbox.showModal === "function") {
    const img = $("[data-lightbox-img]", lightbox);
    const caption = $("[data-lightbox-caption]", lightbox);
    const count = $("[data-lightbox-count]", lightbox);
    const figcaption = $(".lightbox__caption", lightbox);
    let current = 0;
    let trigger = null;

    const show = (index) => {
      current = (index + openers.length) % openers.length;
      const btn = openers[current];
      const thumb = $("img", btn);
      img.src = btn.dataset.full;
      img.alt = thumb.alt;
      caption.textContent = btn.dataset.caption;
      count.textContent = `Photo ${current + 1} of ${openers.length}`;
    };

    openers.forEach((btn, index) => {
      btn.setAttribute("aria-haspopup", "dialog");
      btn.addEventListener("click", () => {
        trigger = btn;
        figcaption.removeAttribute("aria-live");
        show(index);
        lightbox.showModal();
        root.classList.add("has-dialog");
        $("[data-lightbox-close]", lightbox).focus();
        // Announce later photo changes, but not the first one (the dialog name covers it).
        requestAnimationFrame(() => figcaption.setAttribute("aria-live", "polite"));
      });
    });

    $("[data-lightbox-prev]", lightbox).addEventListener("click", () => show(current - 1));
    $("[data-lightbox-next]", lightbox).addEventListener("click", () => show(current + 1));
    $("[data-lightbox-close]", lightbox).addEventListener("click", () => lightbox.close());

    lightbox.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); show(current - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); show(current + 1); }
    });
    // Clicking the dark backdrop closes the viewer.
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox || e.target.classList.contains("lightbox__inner")) lightbox.close();
    });
    lightbox.addEventListener("close", () => {
      root.classList.remove("has-dialog");
      if (trigger) trigger.focus({ preventScroll: true });
    });
  }

  /* ---------- Contact form ---------- */
  const form = $("[data-form]");
  if (form) {
    const status = $(".form__status", form);
    const submit = $("button[type=submit]", form);
    const label = $(".btn__label", submit);
    const phone = cfg.phone || "(424) 444-9990";
    const phoneLink = `<a href="tel:+1${cfg.phoneDigits || "4244449990"}">${phone}</a>`;

    const rules = {
      name: { test: (v) => v.trim().length > 1, message: "Please enter your name." },
      phone: { test: (v) => v.replace(/\D/g, "").length >= 10, message: "Please enter a phone number, including the area code." },
      email: { test: (v) => !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), message: "Please enter a valid email address, or leave it blank." },
      service: { test: (v) => !!v, message: "Please choose at least one option." },
    };

    const setStatus = (html, type) => {
      status.innerHTML = html;
      status.className = `form__status${type ? ` is-${type}` : ""}`;
    };

    const controlsFor = (name) => {
      const el = form.elements[name];
      return el instanceof RadioNodeList ? Array.from(el) : [el];
    };
    const errorFor = (name) => $(`#f-${name}-error`, form);

    const setFieldError = (name, message) => {
      const err = errorFor(name);
      const field = controlsFor(name)[0].closest(".field");
      controlsFor(name).forEach((c) => {
        if (message) c.setAttribute("aria-invalid", "true");
        else c.removeAttribute("aria-invalid");
      });
      if (field) field.classList.toggle("is-invalid", !!message);
      if (err) {
        err.textContent = message || "";
        err.hidden = !message;
      }
    };

    form.addEventListener("input", (e) => {
      const name = e.target.name;
      if (rules[name] && e.target.getAttribute("aria-invalid") === "true" && rules[name].test(String(new FormData(form).get(name) || ""))) {
        setFieldError(name, "");
      }
    });
    // Services are checkboxes: clear the error once at least one is ticked.
    form.addEventListener("change", (e) => {
      if (e.target.name === "service" && new FormData(form).getAll("service").length) setFieldError("service", "");
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      if (data.get("company")) return; // honeypot

      const invalid = Object.keys(rules).filter((name) => !rules[name].test(String(data.get(name) || "")));
      Object.keys(rules).forEach((name) => setFieldError(name, invalid.includes(name) ? rules[name].message : ""));
      if (invalid.length) {
        const n = invalid.length;
        setStatus(`Please fix ${n === 1 ? "the field" : `the ${n} fields`} marked above.`, "error");
        controlsFor(invalid[0])[0].focus();
        return;
      }

      const name = String(data.get("name")).trim();
      const firstName = name.split(" ")[0];
      // Visitors can pick several services; send them as one readable line.
      const services = data.getAll("service").join(", ");
      data.set("service", services);

      if (cfg.formEndpoint) {
        submit.classList.add("is-loading");
        submit.setAttribute("aria-disabled", "true");
        label.textContent = "Sending…";
        try {
          const res = await fetch(cfg.formEndpoint, {
            method: "POST",
            body: data,
            headers: { Accept: "application/json" },
          });
          if (!res.ok) throw new Error(String(res.status));
          form.reset();
          setStatus(`Thanks, ${escapeHtml(firstName)}! We'll call you shortly to confirm the details.`, "success");
        } catch (err) {
          setStatus(`Sorry, that didn't go through. Please call us at ${phoneLink}.`, "error");
        } finally {
          submit.classList.remove("is-loading");
          submit.removeAttribute("aria-disabled");
          label.textContent = "Send request";
        }
        return;
      }

      if (cfg.email) {
        const lines = [
          `Name: ${name}`,
          `Phone: ${data.get("phone")}`,
          `Email: ${data.get("email") || "not given"}`,
          `City or ZIP: ${data.get("city") || "not given"}`,
          `Services: ${services}`,
          "",
          String(data.get("message") || ""),
        ];
        const subject = `Service request: ${services} for ${name}`;
        window.location.href = `mailto:${cfg.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
        setStatus("Your email app should open with your request ready to send.", "success");
        return;
      }

      setStatus(`Thanks, ${escapeHtml(firstName)}! For the fastest booking, give us a call at ${phoneLink}.`, "success");
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
})();
