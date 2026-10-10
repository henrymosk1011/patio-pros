# ProGas Propane — website

Marketing site for **ProGas Propane** (Glendale, CA · (424) 444-9990): propane tank sales and exchange,
home and business delivery, tank storage cages, and patio heater sales, rentals, leasing and repair.

It's a static site (HTML, CSS and plain JavaScript) with no build step and no frameworks.

```
index.html              the page
assets/css/styles.css   design tokens, layout, all animations
assets/js/config.js     settings: phone, email, Google reviews API key, form endpoint
assets/js/main.js       scroll reveals, counters, header, menu, photo viewer, FAQ, form
assets/js/reviews.js    live Google reviews (loads only when configured)
assets/img/             logo, favicons and photos (WebP, resized, EXIF/GPS removed)
```

## Run it locally

Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
```

## Hosting

The site is published with GitHub Pages from this repository
(Settings → Pages → Deploy from a branch). Every push to the published branch updates the live site.
To use a custom domain, add it under Settings → Pages, then update the `og:image` URL in `index.html`.

## Images

The logo, service photos and the "Our work" gallery come from the client's previous Webflow site
(`pro-gas-propane-2`). They were resized into WebP files at several widths, and re-encoding removed the
camera metadata (including GPS location) from the phone photos.

| Folder | Contents |
| ------ | -------- |
| `brand/` | Logo (from "Pro-Gas Logo WHITE.png"), favicons, social share image |
| `hero/` | Night patio with heaters (IMG_5138) |
| `services/` | The seven service photos used on the old site |
| `work/` | Eight portfolio photos from the old site's Photos collection |
| `feature/` | Heater flame, string-light patio (IMG_1555), burner flame, service-area map |

To add a gallery photo, export it at 640, 1280 and 1600 px wide as WebP, put it in `assets/img/work/`,
and copy one of the `<li class="work__item">` blocks in `index.html`. Give it a specific `alt` text.

## Google reviews

Without setup, the Reviews section links to the business's Google Maps and Yelp pages. To show live
Google reviews (star rating, review count and up to 5 recent reviews):

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project and enable
   **Maps JavaScript API** and **Places API (New)**.
2. Create an API key. Under *Application restrictions*, choose **Websites** and add the site's domain.
   Under *API restrictions*, allow only those two APIs.
3. Paste the key into `google.apiKey` in `assets/js/config.js`.

The site only accepts the Google listing whose phone number matches (424) 444-9990, so reviews from a
business with a similar name are never shown. After the first successful load, the browser console prints
the listing's Place ID; paste it into `google.placeId` to skip the search on later visits.

## Contact form

Set `formEndpoint` in `assets/js/config.js` to any form backend that accepts a POST
(Formspree, Getform, Basin, or your own endpoint). Until then, submitting opens the visitor's email app
addressed to `email`. The form has a hidden honeypot field to filter out spam bots.

## Accessibility (WCAG 2.2 AA)

The site was built and tested against WCAG 2.2 level AA, the standard used for ADA website compliance:

- Automated audit with axe-core 4.10 (WCAG 2.0/2.1/2.2 A and AA rules plus best practices): no violations
  on desktop, mobile, the open mobile menu and the open photo viewer.
- Colour contrast checked by hand for text over gradients and photos, which automated tools can't measure.
- Keyboard: skip link, visible focus ring on every control, logical tab order, and the mobile menu and photo
  viewer move focus in and return it on close (Escape closes both).
- Screen readers: landmarks and headings for every section, descriptive alt text for every photo, labelled
  icon buttons, form errors tied to their fields, and a static copy of animated text and numbers.
- Motion: a "Pause animations" button stops all looping animation (WCAG 2.2.2), and visitors who turn on
  "reduce motion" in their system settings get a still page.
- Works at 320 px wide and at 200% text size without horizontal scrolling, and in Windows high-contrast mode.

An automated audit can't prove full compliance. A short manual check with a screen reader (VoiceOver or
NVDA) after content changes is good practice. The footer includes an accessibility contact line.

## Animation and performance

- Only `transform` and `opacity` are animated, so animations run on the GPU and scrolling stays smooth.
- Native scrolling is never hijacked (no smooth-scroll library).
- On-scroll reveals use `IntersectionObserver`, so nothing runs on every scroll event.
- Parallax, the hero fade-out, the process timeline and the progress bar use CSS scroll-driven animations
  in Chrome, Edge and Safari 26+. Other browsers get a small rAF-throttled fallback.
- If you add new styles, don't put `overflow: hidden` on any ancestor of a `.parallax` element (it breaks
  scroll timelines). Use `overflow: clip` instead.

## Confirm with the client

- **Email:** the site uses `info@progaspropane.us` (printed on their tank-cage signage). Their old site
  listed `info@progaspropane.com`. Confirm which one is real; it's set in `config.js` and `index.html`.
- **Service area:** the copy follows their service-area map (Ventura County through LA and Orange County to
  the Inland Empire). Their old site text only mentioned LA and Orange County.
- **"25+ years":** based on "22+ years of service" on the 2023 site. It counts up from 2001 automatically.
- **Street address and hours:** not shown, since the old site only listed "Glendale, CA".
