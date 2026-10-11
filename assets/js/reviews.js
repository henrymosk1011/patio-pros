/*
 * ProGas Propane: customer review tiles.
 * Two sources, both optional:
 *  1. SITE_CONFIG.reviews: real reviews copied into config.js. They show right away.
 *  2. Live Google reviews from the Places API, when google.apiKey is set. They
 *     load only once the section is close to the viewport, so the first paint
 *     never waits on Google.
 * With neither, the static "Read our reviews" links stay in place.
 * Review text is always set with textContent and never parsed as HTML.
 */
(() => {
  "use strict";

  const settings = window.SITE_CONFIG || {};
  const cfg = settings.google || {};
  const body = document.querySelector("[data-reviews]");
  const summary = document.querySelector("[data-reviews-summary]");
  if (!body) return;

  const SVG_NS = "http://www.w3.org/2000/svg";
  const digits = (s) => String(s || "").replace(/\D/g, "");
  const wantedPhone = digits(settings.phoneDigits);
  const mapsSearch = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cfg.query || "ProGas Propane")}`;
  const yelpPage = settings.yelpUrl || "https://www.yelp.com/biz/progas-propane-glendale";

  /* ---------- Reviews pasted into config.js ---------- */
  const safeUrl = (value) => {
    try {
      const url = new URL(String(value));
      return url.protocol === "https:" ? url.href : null;
    } catch (e) {
      return null;
    }
  };

  const formatDate = (value) => {
    if (!value) return "";
    const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(String(value));
    if (!match) return String(value);
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3] || 1));
    return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  };

  const pasted = (Array.isArray(settings.reviews) ? settings.reviews : [])
    .filter((r) => r && r.text && r.author)
    .map((r) => ({
      source: String(r.source || "").toLowerCase() === "yelp" ? "yelp" : "google",
      author: String(r.author),
      rating: Math.max(1, Math.min(5, Number(r.rating) || 5)),
      text: String(r.text),
      when: formatDate(r.date),
      url: safeUrl(r.url),
    }));

  if (pasted.length) renderTiles(pasted, null);

  /* ---------- Live Google reviews ---------- */
  if (cfg.apiKey) {
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      observer.disconnect();
      load().catch((err) => console.warn("[ProGas] Google reviews unavailable:", err.message || err));
    }, { rootMargin: "800px 0px" });
    observer.observe(body);
  }

  function loadMaps() {
    if (window.google && google.maps && google.maps.importLibrary) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const callback = "__siteMapsReady";
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

  // Several businesses can share a similar name, so a search result is only
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
      `[ProGas] Matched Google listing "${match.displayName}" (${match.formattedAddress}).\n` +
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
    const live = (place.reviews || [])
      .filter((r) => (r.rating || 0) >= minRating && r.text)
      .slice(0, Number(cfg.maxReviews) || 5)
      .map((r) => {
        const author = r.authorAttribution || {};
        return {
          source: "google",
          author: author.displayName || "Google user",
          authorUrl: safeUrl(author.uri),
          photo: safeUrl(author.photoURI),
          rating: r.rating || 5,
          text: r.text,
          when: r.relativePublishTimeDescription ||
            (r.publishTime ? new Date(r.publishTime).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : ""),
        };
      });

    if (place.rating) renderSummary(place);
    // Live Google reviews replace pasted Google ones (so nothing shows twice); pasted Yelp reviews stay.
    const tiles = live.concat(pasted.filter((r) => r.source !== "google"));
    if (tiles.length) renderTiles(tiles, place);
  }

  /* ---------- DOM helpers ---------- */
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
    a.appendChild(el("span", "sr-only", " (opens in a new tab)"));
    return a;
  }

  function sourceBadge(source) {
    const badge = el("span", `rtile__source rtile__source--${source}`);
    if (source === "yelp") {
      badge.append(icon("i-star"), document.createTextNode("Yelp"));
    } else {
      badge.append(icon("i-google", "", "0 0 48 48"), document.createTextNode("Google"));
    }
    return badge;
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

  function tile(review, index) {
    const item = el("li", `rtile${index === 0 ? " rtile--feature" : ""}`);
    item.setAttribute("data-reveal", "");

    const top = el("div", "rtile__top");
    top.append(stars(review.rating), sourceBadge(review.source));

    const quote = el("blockquote", "rtile__quote");
    const text = el("p", "rtile__text", review.text);
    const textId = `rtile-text-${index}`;
    text.id = textId;
    quote.appendChild(text);

    const more = el("button", "rtile__more", "Read more");
    more.type = "button";
    more.hidden = true;
    more.setAttribute("aria-expanded", "false");
    more.setAttribute("aria-controls", textId);
    more.addEventListener("click", () => {
      const expanded = item.classList.toggle("is-expanded");
      more.textContent = expanded ? "Show less" : "Read more";
      more.setAttribute("aria-expanded", String(expanded));
    });

    const avatar = el("span", "rtile__avatar");
    avatar.setAttribute("aria-hidden", "true");
    if (review.photo) {
      const img = el("img");
      img.src = review.photo;
      img.alt = "";
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      avatar.appendChild(img);
    } else {
      avatar.textContent = review.author.charAt(0).toUpperCase();
    }

    const who = el("div", "rtile__who");
    who.appendChild(review.authorUrl ? link(review.authorUrl, review.author) : el("span", null, review.author));
    const meta = [review.when, review.url ? null : `on ${review.source === "yelp" ? "Yelp" : "Google"}`].filter(Boolean).join(" ");
    if (meta) who.appendChild(el("small", null, meta));
    if (review.url) who.appendChild(link(review.url, `View on ${review.source === "yelp" ? "Yelp" : "Google"}`, "rtile__view"));

    const footer = el("footer", "rtile__author");
    footer.append(avatar, who);

    item.append(top, quote, more, footer);
    return { item, text, more };
  }

  function renderTiles(reviews, place) {
    const grid = el("ul", "reviews__grid");
    grid.setAttribute("aria-label", "Customer reviews");
    const tiles = reviews.map(tile);
    tiles.forEach(({ item }) => grid.appendChild(item));

    const footer = el("div", "reviews__footer");
    const links = el("div", "reviews__links");
    links.append(
      link((place && place.googleMapsURI) || mapsSearch, "Read all reviews on Google"),
      link(yelpPage, "Review us on Yelp")
    );
    footer.appendChild(links);
    if (place) {
      const attribution = el("span", "reviews__attribution");
      attribution.append(icon("i-google", "", "0 0 48 48"), document.createTextNode("Reviews from Google"));
      footer.appendChild(attribution);
    }

    body.replaceChildren(grid, footer);
    body.classList.add("has-tiles");

    // Only offer "Read more" on reviews that are actually cut off.
    requestAnimationFrame(() => {
      tiles.forEach(({ text, more }) => { more.hidden = text.scrollHeight <= text.clientHeight + 2; });
    });

    const reveal = window.siteUI && window.siteUI.observeReveal;
    if (reveal) tiles.forEach(({ item }) => reveal(item));
  }
})();
