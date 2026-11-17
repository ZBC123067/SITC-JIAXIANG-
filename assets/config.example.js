window.SITC_CLOUD_CONFIG = {
  // Required for cloud schedules, agreement lookup, customer login and booking.
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabasePublishableKey: "YOUR_PUBLISHABLE_KEY",
  adminPath: "./admin.html",
  bookingFunctionName: "submit-booking"
};

window.SITC_MAP_CONFIG = {
  // CARTO basemaps API key (from https://carto.com/basemaps/apikey/).
  // Leave empty to use OpenStreetMap standard basemap (Mode B) with no watermark.
  // Set a valid CARTO API key to enable CARTO Voyager and CARTO Dark basemaps (Mode A).
  cartoApiKey: ""
};
