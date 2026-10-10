/*
 * Patio Pros — live Google reviews.
 * Loads only when an API key is set in config.js, and only once the reviews
 * section is close to the viewport, so it never slows the first paint.
 * Without a key the static "Read our reviews" block stays in place.
 */
(() => {
  "use strict";

  const settings = window.PATIO_PROS || {};
  const cfg = settings.google || {};
  const body = document.querySelector("[data-reviews]");
  const summary = document.querySelector("[data-reviews-summary]");
  if (!body || !cfg.apiKey) return;

  const SVG_NS = "http://www.w3.org/2000/svg";
  const digits = (s) => String(s || "").replace(/\D/g, "");
  const wantedPhone = digits(settings.phoneDigits);

  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    observer.disconnect();
    load().catch((err) => console.warn("[Patio Pros] Google reviews unavailable:", err.message || err));
  }, { rootMargin: "800px 0px" });
  observer.observe(body);

  /* ---------- Google Maps JS loader ---------- */
  function loadMaps() {
    if (window.google && google.maps && google.maps.importLibrary) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const callback = "__patioProsMapsReady";
      window[callback] = () => {
        delete window[callback];
        resolve();
      };
      window.gm_authFailure = () => reject(new Error("Google rejected the API key (check key restrictions and enabled APIs)."));
      const script = document.createElement("script");
      script.src =
        "https://maps.googleapis.com/maps/api/js" +
        `?key=${encodeURIComponent(cfg.apiKey)}&v=weekly&loading=async&callback=${callback}`;
      script.async = true;
      script.onerror = () => reject(new Error("Could not load the Google Maps JavaScript API."));
      document.head.appendChild(script);
    });
  }

  // Several businesses share the "Patio Pros" name, so a search result is only
  // trusted when its phone number matches ours.
  async function findPlace(Place) {
    if (cfg.placeId) return new Place({ id: cfg.placeId });

    const { places } = await Place.searchByText({
      textQuery: cfg.query,
      fields: ["id", "displayName", "nationalPhoneNumber", "internationalPhoneNumber", "formattedAddress"],
      maxResultCount: 10,
    });
    const match = (places || []).find((p) =>
      digits(p.nationalPhoneNumber || p.internationalPhoneNumber).endsWith(wantedPhone)
    );
    if (!match) throw new Error(`No Google listing for "${cfg.query}" has the phone number ${settings.phone}.`);

    console.info(
      `[Patio Pros] Matched Google listing "${match.displayName}" (${match.formattedAddress}).\n` +
      `Set google.placeId to "${match.id}" in assets/js/config.js to skip this lookup.`
    );
    return match;
  }

  async function load() {
    await loadMaps();
    const { Place } = await google.maps.importLibrary("places");
    const place = await findPlace(Place);
    await place.fetchFields({ fields: ["displayName", "rating", "userRatingCount", "reviews", "googleMapsURI"] });

    const minRating = Number(cfg.minRating) || 1;
    const reviews = (place.reviews || [])
      .filter((r) => (r.rating || 0) >= minRating && r.text)
      .slice(0, Number(cfg.maxReviews) || 5);

    if (place.rating) renderSummary(place);
    if (reviews.length) renderReviews(place, reviews);
  }

  /* ---------- DOM helpers (text only — review content is never parsed as HTML) ---------- */
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function icon(id, className = "icon", viewBox = "0 0 24 24") {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", className);
    svg.setAttribute("viewBox", viewBox);
    svg.setAttribute("aria-hidden", "true");
    const use = document.createElementNS(SVG_NS, "use");
    use.setAttribute("href", `#${id}`);
    svg.appendChild(use);
    return svg;
  }

  function stars(rating) {
    const wrap = el("span", "stars");
    wrap.setAttribute("role", "img");
    wrap.setAttribute("aria-label", `Rated ${rating} out of 5`);
    const base = el("span", "stars__row stars__row--base");
    const fill = el("span", "stars__row stars__row--fill");
    for (let i = 0; i < 5; i++) {
      base.appendChild(icon("i-star"));
      fill.appendChild(icon("i-star"));
    }
    fill.style.width = `${Math.max(0, Math.min(5, rating)) * 20}%`;
    wrap.append(base, fill);
    return wrap;
  }

  function link(href, text, className) {
    const a = el("a", className, text);
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener";
    return a;
  }

  /* ---------- Rendering ---------- */
  function renderSummary(place) {
    if (!summary) return;
    const meta = el("div", "rating-meta");
    const count = place.userRatingCount || 0;
    const links = el("div", "rating-links");
    if (place.googleMapsURI) links.appendChild(link(place.googleMapsURI, "Read all reviews"));
    links.appendChild(link(`https://search.google.com/local/writereview?placeid=${encodeURIComponent(place.id)}`, "Write a review"));
    meta.append(stars(place.rating), el("small", null, `Based on ${count} Google review${count === 1 ? "" : "s"}`), links);
    summary.replaceChildren(el("span", "rating-score", place.rating.toFixed(1)), meta);
  }

  function reviewCard(review) {
    const card = el("article", "review card");
    card.setAttribute("data-reveal", "");

    const text = el("p", "review__text", review.text);
    const more = el("button", "review__more", "Read more");
    more.type = "button";
    more.hidden = true;
    more.addEventListener("click", () => {
      const expanded = card.classList.toggle("is-expanded");
      more.textContent = expanded ? "Show less" : "Read more";
    });

    const author = review.authorAttribution || {};
    const name = author.displayName || "Google user";
    const avatar = el("span", "review__avatar");
    if (author.photoURI) {
      const img = el("img");
      img.src = author.photoURI;
      img.alt = "";
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      avatar.appendChild(img);
    } else {
      avatar.textContent = name.charAt(0).toUpperCase();
    }

    const who = el("div", "review__who");
    who.appendChild(author.uri ? link(author.uri, name) : el("span", null, name));
    const when = review.relativePublishTimeDescription ||
      (review.publishTime ? new Date(review.publishTime).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "");
    if (when) who.appendChild(el("small", null, when));

    const footer = el("footer", "review__author");
    footer.append(avatar, who, icon("i-google", "review__g", "0 0 48 48"));

    card.append(stars(review.rating), text, more, footer);
    return { card, text, more };
  }

  function renderReviews(place, reviews) {
    const track = el("div", "reviews__track");
    track.tabIndex = 0;
    track.setAttribute("role", "region");
    track.setAttribute("aria-label", "Customer reviews from Google");

    const cards = reviews.map(reviewCard);
    cards.forEach(({ card }) => track.appendChild(card));

    const attribution = el("span", "reviews__attribution");
    attribution.append(icon("i-google", "", "0 0 48 48"), document.createTextNode("Reviews from Google"));

    const prev = el("button");
    const next = el("button");
    prev.type = next.type = "button";
    prev.setAttribute("aria-label", "Previous reviews");
    next.setAttribute("aria-label", "Next reviews");
    prev.appendChild(icon("i-chevron-left"));
    next.appendChild(icon("i-chevron-right"));
    const nav = el("div", "reviews__nav");
    nav.append(prev, next);

    const controls = el("div", "reviews__controls");
    controls.append(attribution, nav);

    body.replaceChildren(track, controls);

    const step = () => {
      const first = track.firstElementChild;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 20;
      return first ? first.getBoundingClientRect().width + gap : track.clientWidth;
    };
    prev.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: "smooth" }));
    next.addEventListener("click", () => track.scrollBy({ left: step(), behavior: "smooth" }));

    let pending = false;
    const syncNav = () => {
      pending = false;
      const max = track.scrollWidth - track.clientWidth - 2;
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= max;
      nav.hidden = max <= 0;
    };
    track.addEventListener("scroll", () => {
      if (!pending) {
        pending = true;
        requestAnimationFrame(syncNav);
      }
    }, { passive: true });
    window.addEventListener("resize", syncNav, { passive: true });

    requestAnimationFrame(() => {
      syncNav();
      cards.forEach(({ text, more }) => { more.hidden = text.scrollHeight <= text.clientHeight + 2; });
    });

    const reveal = window.patioPros && window.patioPros.observeReveal;
    if (reveal) cards.forEach(({ card }) => reveal(card));
  }
})();
