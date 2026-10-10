/*
 * Patio Pros — site settings.
 * Everything the site owner may need to change lives here.
 */
window.PATIO_PROS = {
  phone: "(818) 970-0798",
  phoneDigits: "8189700798",

  /*
   * Live Google reviews (Places API).
   * 1. In Google Cloud Console, enable "Maps JavaScript API" and "Places API (New)".
   * 2. Create an API key and restrict it to your site's domain (HTTP referrers).
   * 3. Paste the key below. Leave it empty to show the "Read our reviews" fallback.
   *
   * placeId is optional. When it is empty the site searches for `query` and only
   * accepts the listing whose phone number matches `phoneDigits`, so reviews from
   * other businesses named "Patio Pros" are never shown. After the first successful
   * load, the browser console prints the Place ID — paste it here to skip the search.
   */
  google: {
    apiKey: "",
    placeId: "",
    query: "Patio Pros, 433 W Colorado St, Glendale, CA 91204",
    minRating: 4,   // hide reviews rated below this
    maxReviews: 5,  // Google returns at most 5
  },

  /*
   * Contact form. Point this at any form backend that accepts a POST
   * (Formspree, Getform, Basin, your own endpoint…). Leave empty and the form
   * opens the visitor's email app addressed to `email`, or, with no email
   * either, asks them to call.
   */
  formEndpoint: "",
  email: "",
};
