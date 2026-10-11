# ProGas Propane website

Static site (HTML, CSS, plain JS, no build step) for ProGas Propane, Glendale, CA, (424) 444-9990.
Published with GitHub Pages from the `main` branch of `henrymosk1011/progas-propane`:
https://henrymosk1011.github.io/progas-propane/

## Standing instruction from the site owner: always merge to main

Every time the owner asks for a change to the website, finish the change, test it, commit it, and
merge it into `main` right away so it goes live. Do not wait for approval and do not stop at a pull
request. This is a durable, explicit authorization from the owner (given October 2026).

- Do the work on the session's development branch, then bring `main` up to date with it
  (a fast-forward push of that branch to `main`, or a PR that you merge yourself).
- After merging, confirm the "pages build and deployment" run for the new commit succeeded.

## House rules for this site

- No em dashes or en dashes anywhere (copy, alt text, comments, README). Avoid hyphenated words in
  visible copy. Phone numbers keep their hyphen.
- Never invent customer reviews. Review tiles come only from real reviews pasted into
  `assets/js/config.js` or from live Google reviews (Places API key in the same file).
- Keep the site WCAG 2.2 AA: run axe-core on desktop and mobile after changes.
- Animate only `transform` and `opacity`; never hijack native scrolling.
