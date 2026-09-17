/** @type {import('next').NextConfig} */
const noCache = [
  { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
  { key: "Service-Worker-Allowed", value: "/" },
];

const nextConfig = {
  async headers() {
    // Never let the browser HTTP-cache the service worker or manifest, so a new
    // deploy's SW is detected immediately (otherwise a phone can serve a
    // months-old sw.js and never update). The SW itself version-caches assets.
    return [
      { source: "/sw.js", headers: noCache },
      { source: "/manifest.webmanifest", headers: noCache },
    ];
  },
};

module.exports = nextConfig;
