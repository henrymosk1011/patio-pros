/*
 * ProGas Propane: site settings.
 * Everything the site owner may need to change lives here.
 */
window.SITE_CONFIG = {
  phone: "(424) 444-9990",
  phoneDigits: "4244449990",

  /*
   * Live Google reviews (Places API).
   * 1. In Google Cloud Console, enable "Maps JavaScript API" and "Places API (New)".
   * 2. Create an API key and restrict it to your site's domain (HTTP referrers).
   * 3. Paste the key below. Leave it empty to skip live Google reviews.
   *
   * placeId is optional. When it is empty the site searches for `query` and only
   * accepts the listing whose phone number matches `phoneDigits`, so reviews from
   * other businesses with a similar name are never shown. After the first successful
   * load, the browser console prints the Place ID. Paste it here to skip the search.
   */
  google: {
    apiKey: "",
    placeId: "",
    query: "ProGas Propane, Glendale, CA 91204",
    minRating: 4,   // hide reviews rated below this
    maxReviews: 5,  // Google returns at most 5
  },

  yelpUrl: "https://www.yelp.com/biz/progas-propane-glendale",

  /*
   * Review tiles. Copy real reviews here, word for word, from the business's
   * Google or Yelp page (only reviews that really exist; never write your own).
   * They show as tiles in the Reviews section, the first one as the large dark tile.
   * When a Google API key is set, live Google reviews replace the Google ones here.
   *
   * Format, one object per review:
   *   {
   *     source: "Google",            // or "Yelp"
   *     author: "Maria G.",          // as shown on the review
   *     rating: 5,                   // 1 to 5
   *     date: "2025-03",             // YYYY-MM or YYYY-MM-DD
   *     text: "The review text.",
   *     url: "https://...",          // optional: link to the review itself
   *   },
   */
  reviews: [],

  /*
   * Contact form. Point this at any form backend that accepts a POST
   * (Formspree, Getform, Basin, or your own endpoint). Leave it empty and the form
   * opens the visitor's email app addressed to `email`, or, with no email
   * either, asks them to call.
   */
  formEndpoint: "",
  email: "info@progaspropane.us", // confirm with the client: their old site listed info@progaspropane.com
};
