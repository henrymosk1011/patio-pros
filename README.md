# Patio Pros — website

Marketing site for **Patio Pros**, patio heater sales, repair, installation and rentals at
433 W Colorado St, Glendale, CA 91204 · (818) 970-0798.

It's a static site (HTML, CSS and plain JavaScript) with no build step and no frameworks.

```
index.html              the page
assets/css/styles.css   design tokens, layout, all animations
assets/js/config.js     settings: Google reviews API key, form endpoint, email
assets/js/main.js       scroll reveals, counters, header, menu, FAQ, form
assets/js/reviews.js    live Google reviews (loads only when configured)
assets/img/favicon.svg  icon / logo mark
```

## Run it locally

Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
```

## Deploy

Upload the folder to any static host: Netlify, Vercel, Cloudflare Pages, GitHub Pages or plain shared hosting.
Nothing needs to be built.

## Google reviews

Without setup, the Reviews section links to the business's Google Maps and Yelp pages. To show live
Google reviews (star rating, review count and up to 5 recent reviews):

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project and enable
   **Maps JavaScript API** and **Places API (New)**.
2. Create an API key. Under *Application restrictions*, choose **Websites** and add the site's domain
   (for example `patiopros.com/*`). Under *API restrictions*, allow only those two APIs.
3. Paste the key into `google.apiKey` in `assets/js/config.js`.

Several businesses are named "Patio Pros", so the site only accepts the Google listing whose phone number
matches (818) 970-0798. After the first successful load, the browser console prints the listing's
Place ID. Paste it into `google.placeId` to skip the search on later visits.

`minRating` (default 4) hides lower-rated reviews. Google's API returns at most 5 reviews. The script
loads only when a visitor scrolls near the Reviews section, so it doesn't slow the first page load.
Google's [Places API policies](https://developers.google.com/maps/documentation/places/web-service/policies)
require the attribution and author links the section already shows.

## Contact form

Set `formEndpoint` in `assets/js/config.js` to any form backend that accepts a POST
(Formspree, Getform, Basin, or your own endpoint). Until then:

- if `email` is set, submitting opens the visitor's email app with the request filled in;
- otherwise the form thanks the visitor and asks them to call.

The form includes a hidden honeypot field to filter out spam bots.

## Images

The photos are free-license stock images from [Pexels](https://www.pexels.com/license/), loaded from
Pexels' CDN. They're placeholders until the client has their own photos. Each image sits on a warm
gradient, so if one fails to load the layout still looks finished.

| Section        | Photo |
| -------------- | ----- |
| Hero           | [Illuminated patio of restaurant](https://www.pexels.com/photo/illuminated-patio-of-restaurant-18707634/) |
| Why us         | [Close-up of a patio heater](https://www.pexels.com/photo/close-up-photography-of-patio-heater-923289/) (Brett Sayles) |
| Rentals        | [Restaurant patio at night](https://www.pexels.com/photo/restaurant-patio-at-night-18642429/) |
| Gallery        | [Restaurant patio](https://www.pexels.com/photo/decor-of-restaurant-patio-14726700/), [Patio at night](https://www.pexels.com/photo/patio-with-tables-st-night-12290139/), [String lights](https://www.pexels.com/photo/relaxing-in-outdoor-patio-under-string-lights-29063825/), [Outdoor restaurant](https://www.pexels.com/photo/outdoor-restaurant-chairs-and-tables-9787527/), [Bokeh lights](https://www.pexels.com/photo/shallow-focus-photography-of-string-lights-754263/) |
| Tune-up banner | [Gas burner flame](https://www.pexels.com/photo/blurred-burner-flame-flames-195029/) |

To swap a photo, replace the Pexels ID in that `<img>`'s `src` and `srcset` in `index.html`. For the
best performance with the client's own photos, export them as WebP at about 1600–2400px wide, put them
in `assets/img/`, and point `src`/`srcset` at those files.

## Animation and performance

- Only `transform` and `opacity` are animated, so animations run on the GPU and scrolling stays smooth.
- Native scrolling is never hijacked (no smooth-scroll library).
- On-scroll reveals use `IntersectionObserver`, so nothing runs on every scroll event.
- Parallax, the hero fade-out, the process timeline and the progress bar use CSS scroll-driven animations
  in Chrome, Edge and Safari 26+. Other browsers get a small rAF-throttled fallback.
- The hero embers and the marquee pause when they're off-screen.
- `prefers-reduced-motion` turns all motion off.
- If you add new styles, don't put `overflow: hidden` on any ancestor of a `.parallax` element (it breaks
  scroll timelines). Use `overflow: clip` instead.

## Confirm with the client

The copy uses only details from public listings for this phone number. Before launch, confirm:

- business hours (not shown on the site yet)
- an email address for the contact form and footer
- warranty terms, service area and the services list
- whether the Facebook page `@patioprosheater` (listed in Pasadena) is theirs — only Instagram `@patiopros` is linked now
- the logo: the flame-and-heater mark in the header is a placeholder wordmark
